# -*- coding: utf-8 -*-
"""
相場監視アラート - Vercel Cron エンドポイント
15分足で前日高値/安値ブレイク + 20MA + パラボリックSAR 条件でメール通知
"""
import os
import json
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from http.server import BaseHTTPRequestHandler
import requests

BASE_URL = "https://api.twelvedata.com"
INTERVAL_15 = "15min"
INTERVAL_DAY = "1day"
OUTPUTSIZE_15 = 30
OUTPUTSIZE_DAY = 3


def get_env(name: str, default: str = "") -> str:
    return os.environ.get(name, default).strip()


def get_daily_ohlc(api_key: str, symbol: str) -> list:
    """日足を取得（直近3本、新しい順）。"""
    r = requests.get(
        f"{BASE_URL}/time_series",
        params={
            "symbol": symbol,
            "interval": INTERVAL_DAY,
            "outputsize": OUTPUTSIZE_DAY,
            "apikey": api_key,
            "format": "JSON",
        },
        timeout=30,
    )
    r.raise_for_status()
    data = r.json()
    if "values" not in data:
        raise ValueError(f"No values in daily response for {symbol}: {data}")
    return data["values"]


def get_15min_ohlc(api_key: str, symbol: str) -> list:
    """15分足を取得（直近30本、新しい順）。"""
    r = requests.get(
        f"{BASE_URL}/time_series",
        params={
            "symbol": symbol,
            "interval": INTERVAL_15,
            "outputsize": OUTPUTSIZE_15,
            "apikey": api_key,
            "format": "JSON",
        },
        timeout=30,
    )
    r.raise_for_status()
    data = r.json()
    if "values" not in data:
        raise ValueError(f"No values in 15min response for {symbol}: {data}")
    return data["values"]


# --- アプリ内計算: SMA と パラボリックSAR（Twelve Data の指標APIを使わない） ---

def calc_sma(close_prices: list, period: int) -> list[float | None]:
    """
    終値リストからSMAを計算。先頭が直近（新しい順）を想定。
    戻り値: 各インデックス i に対し、その足を含む直近 period 本の終値の平均。
    足が period 未満の位置では None の代わりに 0 を返さず、計算可能な分だけ返す。
    """
    if not close_prices or period <= 0:
        return []
    n = len(close_prices)
    # close_prices[0]=最新, close_prices[n-1]=最古
    # インデックス i のSMA = close_prices[i : i+period] の平均（i+period <= n）
    result = []
    for i in range(n):
        end = i + period
        if end > n:
            result.append(None)  # データ不足
        else:
            window = close_prices[i : i + period]
            result.append(sum(window) / period)
    return result


def calc_parabolic_sar(
    highs: list[float],
    lows: list[float],
    closes: list[float],
    af_start: float = 0.02,
    af_increment: float = 0.02,
    af_max: float = 0.2,
) -> list[float | None]:
    """
    パラボリックSARを計算。時系列は古い順（index 0 が最古）で渡すこと。
    戻り値: 各バーに対するSAR値（反転前のバーなどは None になる場合あり）。
    """
    n = len(highs)
    if n < 2:
        return [None] * n

    sar_values = [None] * n
    # 初期トレンド: 2本目終値 > 1本目終値 → 上昇、そうでなければ下降
    if closes[1] > closes[0]:
        trend = 1  # 上昇
        ep = highs[1]
        sar = lows[0]
        af = af_start
    else:
        trend = -1  # 下降
        ep = lows[1]
        sar = highs[0]
        af = af_start

    sar_values[0] = sar
    sar_values[1] = sar

    for i in range(2, n):
        high, low, close = highs[i], lows[i], closes[i]
        if trend == 1:
            # 上昇: SARは下にあり、EPは高値の更新
            sar = sar + af * (ep - sar)
            # 前足の安値を下回らない（ Wilder のルール）
            if i >= 2:
                sar = min(sar, lows[i - 1])
            if i >= 3:
                sar = min(sar, lows[i - 2])
            if low < sar:
                trend = -1
                sar = ep  # 反転時はEP（高値）を新SARに
                ep = low
                af = af_start
                sar_values[i] = sar
                continue
            if high > ep:
                ep = high
                af = min(af + af_increment, af_max)
        else:
            # 下降
            sar = sar - af * (sar - ep)
            if i >= 2:
                sar = max(sar, highs[i - 1])
            if i >= 3:
                sar = max(sar, highs[i - 2])
            if high > sar:
                trend = 1
                sar = ep
                ep = high
                af = af_start
                sar_values[i] = sar
                continue
            if low < ep:
                ep = low
                af = min(af + af_increment, af_max)
        sar_values[i] = sar

    return sar_values


def float_or(s: str, default: float) -> float:
    try:
        return float(s)
    except (TypeError, ValueError):
        return default


def last_closed_bar(values: list) -> dict | None:
    """直近確定足（2本目を採用し、未確定足を避ける）。"""
    if not values or len(values) < 2:
        return values[0] if values else None
    return values[1]


def previous_day_from_daily(daily_values: list) -> dict | None:
    """前日足（日足の2本目＝1つ前の日）。"""
    if not daily_values or len(daily_values) < 2:
        return None
    return daily_values[1]


def evaluate_symbol(api_key: str, symbol: str, label: str) -> list:
    """
    1銘柄について条件を評価し、成立したアラートのリストを返す。
    SMA と パラボリックSAR は15分足OHLCからアプリ内で計算（Twelve Data 指標APIは使わない）。
    戻り値: [ {"direction": "long"|"short", "close": float, "prev_high": float, ...}, ... ]
    """
    daily = get_daily_ohlc(api_key, symbol)
    ohlc_15 = get_15min_ohlc(api_key, symbol)

    prev_day = previous_day_from_daily(daily)
    if not prev_day:
        return []

    prev_high = float_or(prev_day.get("high"), 0)
    prev_low = float_or(prev_day.get("low"), 0)
    if prev_high <= 0 or prev_low <= 0:
        return []

    bar = last_closed_bar(ohlc_15)
    if not bar:
        return []

    bar_dt = bar.get("datetime", "")
    close = float_or(bar.get("close"), 0)
    if close <= 0:
        return []

    # 15分足は新しい順 → 終値リスト（新しい順）
    close_prices = [float_or(b.get("close"), 0) for b in ohlc_15]
    sma_list = calc_sma(close_prices, 20)
    # 直近確定足 = インデックス 1 のSMA
    ma20 = sma_list[1] if len(sma_list) > 1 and sma_list[1] is not None else 0

    # パラボリックSAR: 時系列は古い順で渡す
    ohlc_oldest_first = list(reversed(ohlc_15))
    highs = [float_or(b.get("high"), 0) for b in ohlc_oldest_first]
    lows = [float_or(b.get("low"), 0) for b in ohlc_oldest_first]
    closes_asc = [float_or(b.get("close"), 0) for b in ohlc_oldest_first]
    sar_list = calc_parabolic_sar(highs, lows, closes_asc)
    # 直近確定足 = 新しい順で2本目 → 古い順では (n-2) 番目
    idx_last_closed = len(sar_list) - 2
    sar_val = sar_list[idx_last_closed] if 0 <= idx_last_closed < len(sar_list) and sar_list[idx_last_closed] is not None else 0

    alerts = []

    # 前日高値ブレイク + 終値 > 20MA + 終値 > SAR → ロング
    if close > prev_high and ma20 > 0 and close > ma20 and (sar_val <= 0 or close > sar_val):
        alerts.append({
            "direction": "long",
            "symbol": symbol,
            "label": label,
            "close": close,
            "prev_high": prev_high,
            "prev_low": prev_low,
            "ma20": ma20,
            "sar": sar_val,
            "datetime": bar_dt,
        })

    # 前日安値ブレイク + 終値 < 20MA + 終値 < SAR → ショート
    if close < prev_low and ma20 > 0 and close < ma20 and (sar_val <= 0 or close < sar_val):
        alerts.append({
            "direction": "short",
            "symbol": symbol,
            "label": label,
            "close": close,
            "prev_high": prev_high,
            "prev_low": prev_low,
            "ma20": ma20,
            "sar": sar_val,
            "datetime": bar_dt,
        })

    return alerts


def send_alert_email(alert: dict) -> None:
    """1件のアラートをメール送信。"""
    from_addr = get_env("ALERT_MAIL_FROM")
    to_addr = get_env("ALERT_MAIL_TO")
    smtp_host = get_env("SMTP_HOST")
    smtp_port = get_env("SMTP_PORT")
    smtp_user = get_env("SMTP_USER")
    smtp_pass = get_env("SMTP_PASSWORD")

    if not all([from_addr, to_addr, smtp_host, smtp_port, smtp_user, smtp_pass]):
        return

    direction_ja = "前日高値ブレイク（ロング）" if alert["direction"] == "long" else "前日安値ブレイク（ショート）"
    subject = f"[相場アラート] {alert['label']} {direction_ja} - {alert['datetime']}"

    body = f"""
銘柄: {alert['label']} ({alert['symbol']})
方向: {direction_ja}
条件成立時刻: {alert['datetime']}

終値: {alert['close']}
前日高値: {alert['prev_high']}
前日安値: {alert['prev_low']}
15分足20MA: {alert['ma20']}
パラボリックSAR: {alert['sar']}

※ 自動売買は行いません。判断はご自身でお願いします。
""".strip()

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = from_addr
    msg["To"] = to_addr
    msg.attach(MIMEText(body, "plain", "utf-8"))

    port = int(smtp_port) if smtp_port.isdigit() else 587
    context = ssl.create_default_context()
    with smtplib.SMTP(smtp_host, port, timeout=15) as server:
        server.ehlo()
        server.starttls(context=context)
        server.login(smtp_user, smtp_pass)
        server.sendmail(from_addr, [to_addr], msg.as_string())


def run_checks() -> dict:
    """全銘柄をチェックし、送信したアラート数とエラーを返す。"""
    api_key = get_env("TWELVE_DATA_API_KEY")
    if not api_key:
        return {"ok": False, "error": "TWELVE_DATA_API_KEY not set", "sent": 0}

    symbols = [("USD/JPY", "USD/JPY")]
    nikkei = get_env("NIKKEI_SYMBOL")
    if nikkei:
        symbols.append((nikkei, "日経225先物"))

    sent = 0
    seen = set()  # 同一実行内の重複防止: (symbol, direction)
    errors = []

    for symbol, label in symbols:
        try:
            alerts = evaluate_symbol(api_key, symbol, label)
            for a in alerts:
                key = (a["symbol"], a["direction"])
                if key in seen:
                    continue
                seen.add(key)
                send_alert_email(a)
                sent += 1
        except Exception as e:
            errors.append(f"{symbol}: {str(e)[:200]}")
            continue

    if errors and sent == 0 and len(errors) == len(symbols):
        return {"ok": False, "error": "; ".join(errors), "sent": 0}
    return {"ok": True, "sent": sent, "error": None, "skipped": errors if errors else None}


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        auth = self.headers.get("Authorization", "")
        expected = get_env("CRON_SECRET")
        if not expected or auth != f"Bearer {expected}":
            self.send_response(401)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Unauthorized"}, ensure_ascii=False).encode("utf-8"))
            return

        try:
            result = run_checks()
        except Exception as e:
            err_msg = str(e).replace("\r", " ").replace("\n", " ")[:500]
            result = {"ok": False, "error": err_msg, "sent": 0}

        if result.get("error"):
            result["error"] = str(result["error"]).replace("\r", " ").replace("\n", " ")[:500]
        status = 200 if result.get("ok") else 500
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.end_headers()
        try:
            body = json.dumps(result, ensure_ascii=False).encode("utf-8")
            self.wfile.write(body)
        except Exception as write_err:
            self.wfile.write(json.dumps({"ok": False, "error": str(write_err)[:200], "sent": 0}).encode("utf-8"))

    def log_message(self, format, *args):
        pass
