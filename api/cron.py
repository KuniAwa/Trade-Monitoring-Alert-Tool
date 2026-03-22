# -*- coding: utf-8 -*-
"""
相場監視アラート - Vercel Cron エンドポイント
15分足で前日高値/安値ブレイク + 20MA（+ オプションでパラボリックSAR）条件でメール通知
"""
import os
import json
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from http.server import BaseHTTPRequestHandler
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
import time
import requests

# 停止中の銘柄（再開時は set から削除するのみ）
# Twelve Data の Minutely 制限対策などで一時停止したい場合はここに追加する。
SYMBOLS_DISABLED: set[str] = {"AUD/JPY", "EUR/JPY"}

BASE_URL = "https://api.twelvedata.com"
YAHOO_CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart"
YAHOO_NIKKEI_CANDIDATES = ["NIY=F", "^N225"]
INTERVAL_15 = "15min"
INTERVAL_1H = "1h"
INTERVAL_DAY = "1day"
OUTPUTSIZE_15 = 30
OUTPUTSIZE_1H = 25
OUTPUTSIZE_DAY = 3

# 押し率: 50%以上は除外、33%以内を理想とする
OSHIRITSU_EXCLUDE_PCT = 50.0
OSHIRITSU_IDEAL_PCT = 33.0

# アラート・サマリーでのパラボリックSAR: False のとき算定しない（条件からも除外）。True で再有効化。
USE_PARABOLIC_SAR_IN_ALERTS = False


def get_env(name: str, default: str = "") -> str:
    return os.environ.get(name, default).strip()


def get_daily_ohlc(api_key: str, symbol: str) -> list:
    """日足を取得（直近3本、新しい順）。前日高値・安値は NY 基準のため America/New_York で取得。"""
    r = requests.get(
        f"{BASE_URL}/time_series",
        params={
            "symbol": symbol,
            "interval": INTERVAL_DAY,
            "outputsize": OUTPUTSIZE_DAY,
            "timezone": "America/New_York",
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


def _fetch_yahoo_chart(symbol: str, interval: str, range_value: str) -> list[dict]:
    """
    Yahoo Finance chart API から OHLC を取得し、
    Twelve Data と同じ「新しい順」の dict リストに正規化して返す。
    """
    r = requests.get(
        f"{YAHOO_CHART_URL}/{symbol}",
        params={"interval": interval, "range": range_value},
        timeout=30,
    )
    r.raise_for_status()
    payload = r.json()
    chart = payload.get("chart", {})
    result = chart.get("result") or []
    if not result:
        raise ValueError(f"No chart result from Yahoo Finance for {symbol}: {payload}")
    item = result[0]
    timestamps = item.get("timestamp") or []
    quote = ((item.get("indicators") or {}).get("quote") or [{}])[0]
    opens = quote.get("open") or []
    highs = quote.get("high") or []
    lows = quote.get("low") or []
    closes = quote.get("close") or []
    if not timestamps:
        raise ValueError(f"No timestamps from Yahoo Finance for {symbol}: {payload}")

    tz = ZoneInfo("Asia/Tokyo")
    rows: list[dict] = []
    n = min(len(timestamps), len(opens), len(highs), len(lows), len(closes))
    for i in range(n):
        o = opens[i]
        h = highs[i]
        l = lows[i]
        c = closes[i]
        if o is None or h is None or l is None or c is None:
            continue
        dt = datetime.fromtimestamp(int(timestamps[i]), tz)
        rows.append(
            {
                "datetime": dt.strftime("%Y-%m-%d %H:%M:%S"),
                "open": str(o),
                "high": str(h),
                "low": str(l),
                "close": str(c),
            }
        )
    if not rows:
        raise ValueError(f"No valid OHLC rows from Yahoo Finance for {symbol}")
    return list(reversed(rows))


def _resolve_nikkei_symbol_yahoo() -> str | None:
    """Yahoo Finance で取得可能な日経225系シンボルを返す。"""
    for sym in YAHOO_NIKKEI_CANDIDATES:
        try:
            _fetch_yahoo_chart(sym, "1d", "5d")
            return sym
        except Exception:
            continue
    return None


def get_prev_session_high_low_jst_1545(api_key: str, symbol: str) -> tuple[float | None, float | None]:
    """
    日経225先物用: 前日の日中セッション（JST 09:00〜15:45）の高値・安値を返す。
    15分足を JST で取得し、該当セッションの max(high), min(low) を計算。
    """
    tz = ZoneInfo("Asia/Tokyo")
    today = datetime.now(tz).date()
    yesterday = today - timedelta(days=1)
    start_str = f"{yesterday.isoformat()}T09:00:00"
    end_str = f"{yesterday.isoformat()}T15:45:00"
    try:
        if symbol in YAHOO_NIKKEI_CANDIDATES:
            values = _fetch_yahoo_chart(symbol, "15m", "5d")
            session_values = []
            for b in values:
                dt = b.get("datetime", "")
                try:
                    d = datetime.fromisoformat(dt)
                except Exception:
                    continue
                if d.date() == yesterday and "09:00" <= d.strftime("%H:%M") <= "15:45":
                    session_values.append(b)
            if not session_values:
                return (None, None)
            highs = [float_or(b.get("high"), 0) for b in session_values if float_or(b.get("high"), 0) > 0]
            lows = [float_or(b.get("low"), 0) for b in session_values if float_or(b.get("low"), 0) > 0]
            if not highs or not lows:
                return (None, None)
            return (max(highs), min(lows))

        r = requests.get(
            f"{BASE_URL}/time_series",
            params={
                "symbol": symbol,
                "interval": INTERVAL_15,
                "start_date": start_str,
                "end_date": end_str,
                "timezone": "Asia/Tokyo",
                "apikey": api_key,
                "format": "JSON",
            },
            timeout=30,
        )
        r.raise_for_status()
        data = r.json()
        values = data.get("values") or []
        if not values:
            return (None, None)
        highs = [float_or(b.get("high"), 0) for b in values if float_or(b.get("high"), 0) > 0]
        lows = [float_or(b.get("low"), 0) for b in values if float_or(b.get("low"), 0) > 0]
        if not highs or not lows:
            return (None, None)
        return (max(highs), min(lows))
    except Exception:
        return (None, None)


def get_15min_ohlc(api_key: str, symbol: str) -> list:
    """15分足を取得（直近30本、新しい順）。日本時間で返す。"""
    if symbol in YAHOO_NIKKEI_CANDIDATES:
        return _fetch_yahoo_chart(symbol, "15m", "10d")
    r = requests.get(
        f"{BASE_URL}/time_series",
        params={
            "symbol": symbol,
            "interval": INTERVAL_15,
            "outputsize": OUTPUTSIZE_15,
            "timezone": "Asia/Tokyo",
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


def get_1h_ohlc(api_key: str, symbol: str) -> list:
    """1時間足を取得（直近25本、新しい順）。日本時間で返す。"""
    if symbol in YAHOO_NIKKEI_CANDIDATES:
        return _fetch_yahoo_chart(symbol, "60m", "1mo")
    r = requests.get(
        f"{BASE_URL}/time_series",
        params={
            "symbol": symbol,
            "interval": INTERVAL_1H,
            "outputsize": OUTPUTSIZE_1H,
            "timezone": "Asia/Tokyo",
            "apikey": api_key,
            "format": "JSON",
        },
        timeout=30,
    )
    r.raise_for_status()
    data = r.json()
    if "values" not in data:
        raise ValueError(f"No values in 1h response for {symbol}: {data}")
    return data["values"]


def check_symbol_available(api_key: str, symbol: str) -> bool:
    """指定シンボルが Twelve Data で取得可能か簡易チェック（日足1本だけ取得）。"""
    try:
        r = requests.get(
            f"{BASE_URL}/time_series",
            params={
                "symbol": symbol,
                "interval": INTERVAL_DAY,
                "outputsize": 1,
                "timezone": "America/New_York",
                "apikey": api_key,
                "format": "JSON",
            },
            timeout=15,
        )
        if r.status_code != 200:
            return False
        data = r.json()
        return "values" in data and len(data.get("values", [])) > 0
    except Exception:
        return False


def get_nikkei_symbol_candidates() -> list[str]:
    """日経225先物のシンボル候補リスト。環境変数 NIKKEI_SYMBOL_CANDIDATES で上書き可（カンマ区切り）。"""
    env = get_env("NIKKEI_SYMBOL_CANDIDATES")
    if env:
        return [s.strip() for s in env.split(",") if s.strip()]
    # NOTE:
    # N225/NIY/NK225 のような「指数（Index）」系シンボルは time_series で 404 になるケースがあります。
    # そのため、まずは日経225連動ETF（例: 1321, 1570）側を優先して解決します。
    return ["1321", "1570"]


def resolve_nikkei_symbol(api_key: str) -> str | None:
    """Yahoo Finance で取得可能な日経225系シンボルを返す。Twelve Data にはフォールバックしない。"""
    return _resolve_nikkei_symbol_yahoo()


def search_symbol_candidates(api_key: str, query: str) -> list[dict]:
    """
    Twelve Data のシンボル検索。日経225など候補を調べる補助用。
    戻り値: [ {"symbol": "...", "name": "...", "exchange": "..." }, ... ]
    """
    try:
        r = requests.get(
            f"{BASE_URL}/stocks",
            params={"symbol": query, "apikey": api_key, "format": "JSON"},
            timeout=15,
        )
        if r.status_code != 200:
            return []
        data = r.json()
        if isinstance(data, list):
            return [{"symbol": x.get("symbol", ""), "name": x.get("name", ""), "exchange": x.get("exchange", "")} for x in data]
        if isinstance(data, dict) and "data" in data:
            return [{"symbol": x.get("symbol", ""), "name": x.get("name", ""), "exchange": x.get("exchange", "")} for x in data["data"]]
        return []
    except Exception:
        return []


def load_settings() -> dict:
    """settings.json を読み、監視時間などを返す。"""
    try:
        base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        path = os.path.join(base, "settings.json")
        if os.path.isfile(path):
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception:
        pass
    return {"monitor": {"start_jst": "00:00", "end_jst": "23:59"}}


def is_within_monitor_window(settings: dict) -> bool:
    """現在時刻（JST）が監視時間内か。"""
    tz = ZoneInfo("Asia/Tokyo")
    now = datetime.now(tz).strftime("%H:%M")
    mon = settings.get("monitor", {})
    start = mon.get("start_jst", "00:00")
    end = mon.get("end_jst", "23:59")
    if start <= end:
        return start <= now <= end
    return now >= start or now <= end


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


def evaluate_symbol(api_key: str, symbol: str, label: str, use_jst_session_1545: bool = False) -> list:
    """
    1銘柄について条件を評価し、成立したアラートのリストを返す。
    use_jst_session_1545=True のとき前日高値・安値は JST 日中セッション（09:00〜15:45）基準。
    """
    if use_jst_session_1545:
        prev_high, prev_low = get_prev_session_high_low_jst_1545(api_key, symbol)
        if prev_high is None or prev_low is None or prev_high <= 0 or prev_low <= 0:
            return []
    else:
        daily = get_daily_ohlc(api_key, symbol)
        prev_day = previous_day_from_daily(daily)
        if not prev_day:
            return []
        prev_high = float_or(prev_day.get("high"), 0)
        prev_low = float_or(prev_day.get("low"), 0)
        if prev_high <= 0 or prev_low <= 0:
            return []

    ohlc_15 = get_15min_ohlc(api_key, symbol)
    ohlc_1h = get_1h_ohlc(api_key, symbol)

    bar = last_closed_bar(ohlc_15)
    if not bar:
        return []

    bar_dt = bar.get("datetime", "")
    close = float_or(bar.get("close"), 0)
    bar_high = float_or(bar.get("high"), 0)
    bar_low = float_or(bar.get("low"), 0)
    if close <= 0:
        return []

    # 15分足 20MA
    close_prices = [float_or(b.get("close"), 0) for b in ohlc_15]
    sma_list = calc_sma(close_prices, 20)
    ma20 = sma_list[1] if len(sma_list) > 1 and sma_list[1] is not None else 0

    # 15分足 パラボリックSAR（停止中は算定しない。USE_PARABOLIC_SAR_IN_ALERTS を True で復帰）
    sar_val = 0.0
    if USE_PARABOLIC_SAR_IN_ALERTS:
        ohlc_oldest_first = list(reversed(ohlc_15))
        highs = [float_or(b.get("high"), 0) for b in ohlc_oldest_first]
        lows = [float_or(b.get("low"), 0) for b in ohlc_oldest_first]
        closes_asc = [float_or(b.get("close"), 0) for b in ohlc_oldest_first]
        sar_list = calc_parabolic_sar(highs, lows, closes_asc)
        idx_last_closed = len(sar_list) - 2
        sar_val = sar_list[idx_last_closed] if 0 <= idx_last_closed < len(sar_list) and sar_list[idx_last_closed] is not None else 0

    # 1時間足 環境認識（直近確定1h足: 終値 vs 20MA）
    closes_1h = [float_or(b.get("close"), 0) for b in ohlc_1h]
    sma_1h = calc_sma(closes_1h, 20)
    bar_1h = last_closed_bar(ohlc_1h)
    close_1h = float_or(bar_1h.get("close"), 0) if bar_1h else 0
    ma20_1h = sma_1h[1] if len(sma_1h) > 1 and sma_1h[1] is not None else 0
    trend_1h_up = close_1h > ma20_1h and ma20_1h > 0
    trend_1h_down = close_1h < ma20_1h and ma20_1h > 0

    alerts = []

    sar_ok_long = True
    sar_ok_short = True
    if USE_PARABOLIC_SAR_IN_ALERTS:
        sar_ok_long = (sar_val <= 0 or close > sar_val)
        sar_ok_short = (sar_val <= 0 or close < sar_val)

    # ロング: 前日高値ブレイク + 15分20MA + (SAR) + 1h上昇環境 + 押し率50%未満
    if close > prev_high and ma20 > 0 and close > ma20 and sar_ok_long and trend_1h_up:
        denom = bar_high - prev_high
        oshiritsu_pct = ((bar_high - close) / denom * 100.0) if denom > 0 else 0.0
        if oshiritsu_pct >= OSHIRITSU_EXCLUDE_PCT:
            pass
        else:
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
                "oshiritsu_pct": round(oshiritsu_pct, 1),
                "ma20_1h": ma20_1h,
                "close_1h": close_1h,
            })

    # ショート: 前日安値ブレイク + 15分20MA + (SAR) + 1h下降環境 + 押し率50%未満
    if close < prev_low and ma20 > 0 and close < ma20 and sar_ok_short and trend_1h_down:
        denom = prev_low - bar_low
        oshiritsu_pct = ((close - bar_low) / denom * 100.0) if denom > 0 else 0.0
        if oshiritsu_pct >= OSHIRITSU_EXCLUDE_PCT:
            pass
        else:
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
                "oshiritsu_pct": round(oshiritsu_pct, 1),
                "ma20_1h": ma20_1h,
                "close_1h": close_1h,
            })

    return alerts


def _format_datetime_display(dt_str: str) -> str:
    """メール用の日時表示。API に timezone=Asia/Tokyo を指定しているためそのまま JST として表示。"""
    if not dt_str:
        return dt_str
    s = dt_str.strip()[:19]
    return f"{s} JST" if s else dt_str


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

    dt_display = _format_datetime_display(alert.get("datetime", ""))
    direction_ja = "前日高値ブレイク（ロング）" if alert["direction"] == "long" else "前日安値ブレイク（ショート）"
    subject = f"[相場アラート] {alert['label']} {direction_ja} - {dt_display}"

    oshi = alert.get("oshiritsu_pct")
    oshi_note = f"（理想: {OSHIRITSU_IDEAL_PCT}%以内）" if (oshi is not None and oshi <= OSHIRITSU_IDEAL_PCT) else ""
    sar_display = alert["sar"] if USE_PARABOLIC_SAR_IN_ALERTS else "—（停止中）"

    body = f"""
━━━━━━━━━━━━━━━━━━━━━━
  相場監視アラート
━━━━━━━━━━━━━━━━━━━━━━

【銘柄】 {alert['label']} ({alert['symbol']})
【方向】 {direction_ja}
【条件成立時刻】 {dt_display}

────────────────────
  15分足
────────────────────
  終値        : {alert['close']}
  20MA        : {alert['ma20']}
  パラボリックSAR : {sar_display}

────────────────────
  前日（NY基準）
────────────────────
  前日高値    : {alert['prev_high']}
  前日安値    : {alert['prev_low']}

────────────────────
  1時間足（環境認識）
────────────────────
  終値        : {alert.get('close_1h', '-')}
  20MA        : {alert.get('ma20_1h', '-')}

────────────────────
  押し率      : {oshi if oshi is not None else '-'}% {oshi_note}
────────────────────

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


def should_send_daily_summary() -> tuple[bool, str | None, str]:
    """
    平日のサマリー送信タイミングを判定。
    - 平日かつ JST 23:00〜23:14（Cron のずれ対策）に1回だけ、監視対象の全銘柄（FX + 日経）を1通にまとめて送信 → ("all", now_str)
    戻り値: (送信するか, グループ "all"|None, 表示用 JST 文字列)
    """
    tz = ZoneInfo("Asia/Tokyo")
    now = datetime.now(tz)
    if now.weekday() > 4:
        return (False, None, "")
    hm = now.strftime("%H:%M")
    now_str = now.strftime("%Y-%m-%d %H:%M JST")
    if "23:00" <= hm < "23:15":
        return (True, "all", now_str)
    return (False, None, "")


def build_snapshot(
    api_key: str,
    symbol: str,
    label: str,
    use_jst_session_1545: bool,
) -> dict | None:
    """
    サマリーメール用に1銘柄分のスナップショットを構築。
    アラート条件には関係なく、現在の状態をそのまま返す。
    """
    # 前日高値・安値
    if use_jst_session_1545:
        prev_high, prev_low = get_prev_session_high_low_jst_1545(api_key, symbol)
        if prev_high is None or prev_low is None:
            return None
    else:
        daily = get_daily_ohlc(api_key, symbol)
        prev_day = previous_day_from_daily(daily)
        if not prev_day:
            return None
        prev_high = float_or(prev_day.get("high"), 0)
        prev_low = float_or(prev_day.get("low"), 0)
        if prev_high <= 0 or prev_low <= 0:
            return None

    # 15分足・1時間足
    ohlc_15 = get_15min_ohlc(api_key, symbol)
    ohlc_1h = get_1h_ohlc(api_key, symbol)
    bar = last_closed_bar(ohlc_15)
    if not bar:
        return None
    bar_dt = bar.get("datetime", "")
    close = float_or(bar.get("close"), 0)
    if close <= 0:
        return None

    # 15分足 20MA
    close_prices = [float_or(b.get("close"), 0) for b in ohlc_15]
    sma_list = calc_sma(close_prices, 20)
    ma20 = sma_list[1] if len(sma_list) > 1 and sma_list[1] is not None else 0

    # 15分足 SAR（停止中は算定しない）
    sar_val = 0.0
    if USE_PARABOLIC_SAR_IN_ALERTS:
        ohlc_oldest_first = list(reversed(ohlc_15))
        highs = [float_or(b.get("high"), 0) for b in ohlc_oldest_first]
        lows = [float_or(b.get("low"), 0) for b in ohlc_oldest_first]
        closes_asc = [float_or(b.get("close"), 0) for b in ohlc_oldest_first]
        sar_list = calc_parabolic_sar(highs, lows, closes_asc)
        idx_last_closed = len(sar_list) - 2
        sar_val = sar_list[idx_last_closed] if 0 <= idx_last_closed < len(sar_list) and sar_list[idx_last_closed] is not None else 0

    # 1時間足 20MA
    closes_1h = [float_or(b.get("close"), 0) for b in ohlc_1h]
    sma_1h = calc_sma(closes_1h, 20)
    bar_1h = last_closed_bar(ohlc_1h)
    close_1h = float_or(bar_1h.get("close"), 0) if bar_1h else 0
    ma20_1h = sma_1h[1] if len(sma_1h) > 1 and sma_1h[1] is not None else 0

    # 押し率（ロング方向想定で算出。ショート側は参考値として同一式は使わない）
    bar_high = float_or(bar.get("high"), 0)
    bar_low = float_or(bar.get("low"), 0)
    oshiritsu_long = None
    if bar_high > prev_high:
        denom = bar_high - prev_high
        oshiritsu_long = ((bar_high - close) / denom * 100.0) if denom > 0 else 0.0

    return {
        "symbol": symbol,
        "label": label,
        "datetime": bar_dt,
        "close": close,
        "prev_high": prev_high,
        "prev_low": prev_low,
        "ma20_15m": ma20,
        "sar_15m": sar_val if USE_PARABOLIC_SAR_IN_ALERTS else None,
        "close_1h": close_1h,
        "ma20_1h": ma20_1h,
        "oshiritsu_long": round(oshiritsu_long, 1) if oshiritsu_long is not None else None,
    }


def send_summary_email(snapshots: list[dict], now_jst_str: str) -> None:
    """平日のサマリーメール送信（JST 23:00 頃・1日1通）。"""
    from_addr = get_env("ALERT_MAIL_FROM")
    to_addr = get_env("ALERT_MAIL_TO")
    smtp_host = get_env("SMTP_HOST")
    smtp_port = get_env("SMTP_PORT")
    smtp_user = get_env("SMTP_USER")
    smtp_pass = get_env("SMTP_PASSWORD")

    if not all([from_addr, to_addr, smtp_host, smtp_port, smtp_user, smtp_pass]):
        return

    subject = f"[相場サマリー] {len(snapshots)}銘柄定時レポート - {now_jst_str}"

    lines: list[str] = []
    lines.append("━━━━━━━━━━━━━━━━━━━━━━")
    lines.append("  相場サマリー（定時レポート）")
    lines.append("━━━━━━━━━━━━━━━━━━━━━━")
    lines.append(f"【時刻】 {now_jst_str}")
    lines.append("")

    for snap in snapshots:
        dt_display = _format_datetime_display(snap.get("datetime", ""))
        lines.append("────────────────────")
        lines.append(f"  {snap['label']} ({snap['symbol']})")
        lines.append("────────────────────")
        lines.append(f"  条件判定足時刻 : {dt_display}")
        lines.append("")
        lines.append("  15分足")
        lines.append(f"    終値        : {snap['close']}")
        lines.append(f"    20MA        : {snap['ma20_15m']}")
        sar_s = snap.get("sar_15m")
        lines.append(f"    パラボリックSAR : {sar_s if sar_s is not None else '—'}")
        lines.append("")
        lines.append("  前日")
        lines.append(f"    前日高値    : {snap['prev_high']}")
        lines.append(f"    前日安値    : {snap['prev_low']}")
        lines.append("")
        lines.append("  1時間足（環境認識）")
        lines.append(f"    終値        : {snap['close_1h']}")
        lines.append(f"    20MA        : {snap['ma20_1h']}")
        lines.append("")
        oshi = snap.get("oshiritsu_long")
        lines.append("  押し率（ロング想定）")
        lines.append(f"    押し率      : {oshi if oshi is not None else '-'}%")
        lines.append("")

    lines.append("※ このメールは通知専用です。自動売買は行いません。判断はご自身でお願いします。")

    body = "\n".join(lines)

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
    """全銘柄をチェックし、送信したアラート数とエラーを返す。監視時間外はアラートのみスキップ。"""
    settings = load_settings()
    api_key = get_env("TWELVE_DATA_API_KEY")
    if not api_key:
        return {"ok": False, "error": "TWELVE_DATA_API_KEY not set", "sent": 0}

    tz = ZoneInfo("Asia/Tokyo")
    now = datetime.now(tz)
    if now.weekday() > 4:
        return {"ok": True, "sent": 0, "error": None, "skipped": ["weekend (alerts and summary disabled)"]}

    symbols: list[tuple[str, str, bool]] = [
        ("USD/JPY", "USD/JPY", False),
        ("EUR/JPY", "EUR/JPY", False),
        ("AUD/JPY", "AUD/JPY", False),
    ]
    nikkei_explicit = get_env("NIKKEI_SYMBOL")
    if nikkei_explicit:
        # 日経225は Yahoo Finance のみを利用する。Twelve Data 側にはフォールバックしない。
        if nikkei_explicit in YAHOO_NIKKEI_CANDIDATES:
            symbols.append((nikkei_explicit, "日経225先物", True))
    else:
        resolved = resolve_nikkei_symbol(api_key)
        if resolved:
            symbols.append((resolved, "日経225先物", True))

    symbols = [s for s in symbols if s[0] not in SYMBOLS_DISABLED]

    sent = 0
    seen: set[tuple[str, str]] = set()
    errors: list[str] = []
    within_window = is_within_monitor_window(settings)

    if within_window:
        symbols_fx = [s for s in symbols if not s[2]]
        symbols_nikkei = [s for s in symbols if s[2]]

        # FX・日経とも settings.json の監視時間内（既定 09:00〜23:00 JST）で評価。
        # Twelve Data Minutely 対策のため、FX 処理後に61秒空けてから日経を処理する。
        for symbol, label, use_jst_1545 in symbols_fx:
            try:
                alerts = evaluate_symbol(api_key, symbol, label, use_jst_session_1545=use_jst_1545)
                for a in alerts:
                    key = (a["symbol"], a["direction"])
                    if key in seen:
                        continue
                    seen.add(key)
                    send_alert_email(a)
                    sent += 1
            except Exception as e:
                errors.append(f"{symbol}: {str(e)[:200]}")
        if symbols_nikkei:
            time.sleep(61)
        for symbol, label, use_jst_1545 in symbols_nikkei:
            try:
                alerts = evaluate_symbol(api_key, symbol, label, use_jst_session_1545=use_jst_1545)
                for a in alerts:
                    key = (a["symbol"], a["direction"])
                    if key in seen:
                        continue
                    seen.add(key)
                    send_alert_email(a)
                    sent += 1
            except Exception as e:
                errors.append(f"{symbol}: {str(e)[:200]}")

    try:
        should_send, group, now_jst_str = should_send_daily_summary()
        if should_send and group and now_jst_str:
            summary_symbols = list(symbols) if group == "all" else []
            snapshots: list[dict] = []
            for symbol, label, use_jst_1545 in summary_symbols:
                try:
                    snap = build_snapshot(api_key, symbol, label, use_jst_1545)
                    if snap:
                        snapshots.append(snap)
                except Exception as e:
                    errors.append(f"summary {symbol}: {str(e)[:150]}")
            if snapshots:
                try:
                    send_summary_email(snapshots, now_jst_str)
                except Exception as e:
                    errors.append(f"summary send: {str(e)[:150]}")
    except Exception as e:
        errors.append(f"summary: {str(e)[:200]}")

    if errors and sent == 0 and len(errors) == len(symbols):
        return {"ok": False, "error": "; ".join(errors), "sent": 0}
    return {"ok": True, "sent": sent, "error": None, "skipped": errors if errors else None}


def _safe_error_msg(s: str | None) -> str:
    if s is None:
        return ""
    return str(s).replace("\r", " ").replace("\n", " ")[:500]


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
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
                result = {"ok": False, "error": _safe_error_msg(str(e)), "sent": 0}

            if result.get("error"):
                result["error"] = _safe_error_msg(result.get("error"))
            status = 200 if result.get("ok") else 500
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            body = json.dumps(result, ensure_ascii=False).encode("utf-8")
            self.wfile.write(body)
        except Exception as outer:
            try:
                self.send_response(500)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.end_headers()
                err = _safe_error_msg(str(outer))
                self.wfile.write(json.dumps({"ok": False, "error": err, "sent": 0}).encode("utf-8"))
            except Exception:
                pass

    def log_message(self, format, *args):
        pass
