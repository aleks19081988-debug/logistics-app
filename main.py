import io
import datetime
import pandas as pd
import requests
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Logistics App API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Основная таблица маршрутов, деталей, архива и графиков
SPREADSHEET_URL = "https://docs.google.com/spreadsheets/d/1nGRnER-mQj81NugFTaR1rBP87w8a00riPXBFqZDU1dI/edit?gid=0#gid=0"
DETAILS_GID = "1361088490"
ARCHIVE_GID = "89786043"
SCHEDULE_GID = "1663850532"
STAFF_GID = "2037633890"  # Вкладка для сотрудников

# Telegram Bot Token & Google Apps Script
TELEGRAM_BOT_TOKEN = "8981440107:AAGVTEmTGsk5j0_paOxxUa0EuWwQY_pSvIc"
APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyDzUce63R419DyS9aQflRkHFvfrTd_-gtZ9MchVZkqAOIrEt6I4VtBqQnY_4gegspmCg/exec"


def send_telegram_message(chat_id: int, text: str):
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML",
        "disable_web_page_preview": False
    }
    try:
        requests.post(url, json=payload, timeout=5)
    except Exception as e:
        print(f"❌ Ошибка отправки Telegram сообщения (chat_id: {chat_id}):", e)


def get_sheet_data(gid="0", spreadsheet_id=None):
    try:
        sheet_id = spreadsheet_id if spreadsheet_id else SPREADSHEET_URL.split("/d/")[1].split("/")[0]
        export_url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/gviz/tq?tqx=out:csv&gid={gid}"
        response = requests.get(export_url, timeout=10)
        response.encoding = "utf-8"

        if response.status_code != 200:
            return []

        df = pd.read_csv(io.StringIO(response.text), header=None)
        df = df.fillna("")
        return df.values.tolist()
    except Exception as e:
        print(f"❌ Ошибка чтения таблицы (gid: {gid}):", e)
        return []


def get_sheet_data_dict(gid="0", spreadsheet_id=None):
    try:
        sheet_id = spreadsheet_id if spreadsheet_id else SPREADSHEET_URL.split("/d/")[1].split("/")[0]
        export_url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/gviz/tq?tqx=out:csv&gid={gid}"
        response = requests.get(export_url, timeout=10)
        response.encoding = "utf-8"

        if response.status_code != 200:
            return []

        df = pd.read_csv(io.StringIO(response.text))
        df = df.fillna("")
        return df.to_dict(orient="records")
    except Exception as e:
        print(f"❌ Ошибка чтения таблицы словарем (gid: {gid}):", e)
        return []


def load_telegram_users_from_sheet():
    """Загружает привязанных пользователей из вкладки 'Сотрудники'"""
    data = get_sheet_data(gid=STAFF_GID)
    users = {}
    for row in data[1:]:  # пропускаем заголовок
        if len(row) > 1:
            surname = str(row[0]).strip().lower()
            chat_id_val = str(row[1]).strip()
            if surname and chat_id_val and chat_id_val.lower() not in ["nan", "none", "null", ""]:
                try:
                    users[surname] = int(float(chat_id_val))
                except:
                    pass
    return users


def save_user_to_sheet(surname: str, chat_id: int):
    """Отправляет новые данные сотрудника в Google Таблицу через Apps Script"""
    try:
        payload = {
            "action": "save_staff",
            "surname": surname,
            "chat_id": chat_id
        }
        requests.post(APPS_SCRIPT_URL, json=payload, timeout=10)
    except Exception as e:
        print(f"❌ Ошибка сохранения сотрудника в таблицу:", e)


def get_val_from_row(row, possible_names):
    for name in possible_names:
        target = name.lower()
        for key in row.keys():
            clean_key = str(key).strip().lower()
            if clean_key == target or target in clean_key:
                val = str(row[key]).strip()
                if val and val.lower() not in ["nan", "none", "null"]:
                    return val
    return ""


@app.get("/")
def home():
    return {"status": "online"}


@app.get("/api/telegram-users")
def get_telegram_users():
    """Возвращает список всех зарегистрированных пользователей из таблицы"""
    users = load_telegram_users_from_sheet()
    return {
        "total_registered": len(users),
        "users": users
    }


@app.get("/api/routes-by-vehicle")
def get_routes_by_vehicle():
    data = get_sheet_data_dict(gid="0")
    if not data:
        return {}

    sample_row = data[0]
    vehicle_column = None
    target_names = ["№ авто", "авто", "машина", "автомобіль", "транспорт", "водій", "водитель"]
    for col_name in sample_row.keys():
        clean_col = str(col_name).strip().lower()
        if any(t in clean_col for t in target_names):
            vehicle_column = col_name
            break

    if not vehicle_column:
        cols = list(sample_row.keys())
        vehicle_column = cols[1] if len(cols) > 1 else cols[0]

    grouped = {}
    for row in data:
        raw_val = str(row.get(vehicle_column, "")).strip()
        if raw_val.endswith(".0"):
            raw_val = raw_val[:-2]

        vehicle_key = raw_val if raw_val and raw_val.lower() not in ["nan", "none", "null"] else "Без номера авто"

        if vehicle_key not in grouped:
            grouped[vehicle_key] = []
        
        grouped[vehicle_key].append(row)

    return grouped


@app.get("/api/delivery-details/{doc_id}")
def get_delivery_details(doc_id: str):
    details_data = get_sheet_data_dict(gid=DETAILS_GID)
    if not details_data:
        return {"doc_id": doc_id, "items": []}

    doc_id_clean = str(doc_id).strip()
    if doc_id_clean.endswith(".0"):
        doc_id_clean = doc_id_clean[:-2]

    matched_items = []
    for row in details_data:
        row_doc = str(row.get("№ док-ту", "")).strip()
        if row_doc.endswith(".0"):
            row_doc = row_doc[:-2]

        if row_doc == doc_id_clean:
            matched_items.append({
                "doc_id": row_doc,
                "name": row.get("Найменування", ""),
                "quantity": row.get("Кіль- кість", 1),
                "price": row.get("Сума, грн", 0),
                "delivery_point": row.get("Пункт доставки", ""),
                "recipient": row.get("П.І.Б. отримувача", "")
            })

    return {
        "doc_id": doc_id_clean,
        "count": len(matched_items),
        "items": matched_items
    }


@app.get("/api/search-archive/{query}")
def search_archive(query: str):
    archive_data = get_sheet_data_dict(gid=ARCHIVE_GID)
    if not archive_data:
        return {"results": []}

    clean_query = query.strip().lower()
    matched = []

    for row in archive_data:
        row_str = " ".join([str(v).lower() for v in row.values()])
        if clean_query in row_str:
            matched.append({
                "date": row.get("Дата", ""),
                "doc_num": str(row.get("№ док-ту", "")).replace(".0", ""),
                "driver": row.get("Водій / Авто", ""),
                "from": row.get("Звідки", ""),
                "to": row.get("Куди", ""),
                "items": row.get("Товар", "")
            })

    return {"results": matched}


@app.post("/api/archive-day")
def archive_current_day():
    routes_data = get_sheet_data_dict(gid="0")
    details_data = get_sheet_data_dict(gid=DETAILS_GID)

    if not routes_data:
        return {"status": "error", "message": "Маршруты не найдены"}

    details_by_doc = {}
    for item in details_data:
        doc = str(item.get("№ док-ту", "")).strip()
        if doc.endswith(".0"):
            doc = doc[:-2]
        if not doc:
            continue
        
        name = str(item.get("Найменування", "")).strip()
        qty = str(item.get("Кіль- кість", "")).strip()
        item_str = f"{name} ({qty} шт.)" if qty else name

        if doc not in details_by_doc:
            details_by_doc[doc] = []
        if item_str:
            details_by_doc[doc].append(item_str)

    today_str = datetime.date.today().strftime("%d.%m.%Y")
    archive_rows = []

    for row in routes_data:
        doc_num = get_val_from_row(row, ['№ док-ту', '№ док', 'док-ту', 'номер док'])
        if not doc_num:
            continue
            
        driver = get_val_from_row(row, ['водій', 'водитель', '№ авто', 'авто'])
        warehouse = get_val_from_row(row, ['склад', 'звідки', 'откуда'])
        
        city = get_val_from_row(row, ['факт.місто доставки', 'місто', 'город'])
        street = get_val_from_row(row, ['вулиця', 'улица'])
        house = get_val_from_row(row, ['№ будинку', 'будинок', 'дом'])
        destination = ", ".join(filter(None, [city, street, f"д. {house}" if house else ""]))

        items_list = details_by_doc.get(doc_num, [])
        items_summary = "; ".join(items_list) if items_list else "—"

        archive_rows.append([
            today_str,
            doc_num,
            driver,
            warehouse,
            destination,
            items_summary
        ])

    if not archive_rows:
        return {"status": "error", "message": "Нет валидных записей для архивации"}

    try:
        res = requests.post(APPS_SCRIPT_URL, json={"rows": archive_rows}, timeout=45)
        return {"status": "success", "archived_count": len(archive_rows), "script_response": res.json()}
    except requests.exceptions.Timeout:
        return {
            "status": "success",
            "archived_count": len(archive_rows),
            "message": "Записи успешно отправлены в Google Таблицу (обработка заняла больше времени)."
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}


# Telegram Webhook Handler
@app.post("/webhook/telegram")
async def telegram_webhook(request: Request):
    data = await request.json()
    if "message" in data:
        message = data["message"]
        chat_id = message["chat"]["id"]
        text = message.get("text", "").strip()

        if text.startswith("/start"):
            send_telegram_message(
                chat_id,
                "<b>Вітаємо у VEGTAM LOGISTICS BOT!</b> 🚚\n\nБудь ласка, введіть ваше <b>Прізвище</b> (наприклад: <code>Кравченко</code>), щоб отримувати сповіщення про маршрути."
            )
        else:
            text_clean = text.lower()
            save_user_to_sheet(text_clean, chat_id)
            send_telegram_message(
                chat_id,
                f"✅ Дякуємо! Дані <b>{text.title()}</b> успішно прив'язано до цього акаунту в базі.\n\nВи будете отримувати сповіщення при кожній розсилці маршруту!"
            )
    return {"status": "ok"}


@app.post("/api/notify-drivers")
def notify_drivers():
    """Считывает график и базу сотрудников из таблиц, затем рассылает уведомления"""
    try:
        raw_schedule = get_sheet_data(gid=SCHEDULE_GID)
        if not raw_schedule:
            return {"status": "error", "message": "Не удалось подключиться к вкладке 'Графік КД'"}

        telegram_users = load_telegram_users_from_sheet()

        crews_today = []
        for row in raw_schedule[1:]:
            if len(row) > 2:
                vehicle_no = str(row[1]).strip() if len(row) > 1 else ""
                driver = str(row[2]).strip() if len(row) > 2 else ""
                expeditor = str(row[3]).strip() if len(row) > 3 else ""

                if vehicle_no and (driver or expeditor):
                    crews_today.append({
                        "vehicle": vehicle_no,
                        "driver": driver,
                        "expeditor": expeditor
                    })

        if not crews_today:
            return {"status": "error", "message": "В графике не найдены экипажи на сегодня"}

        notified_count = 0
        app_link = "https://logistics-backend-3vj1.onrender.com"

        for crew in crews_today:
            v_num = crew["vehicle"]
            driver_str = crew["driver"].lower()
            expeditor_str = crew["expeditor"].lower()

            message_text = (
                f"🚚 <b>Ваш маршрут на сьогодні готовий!</b>\n\n"
                f"🚗 <b>Авто:</b> <code>{v_num}</code>\n"
                f"👥 <b>Екіпаж:</b> {crew['driver']} / {crew['expeditor']}\n\n"
                f"🔗 <a href='{app_link}'>Натисніть тут, щоб відкрити маршрут в VEGTAM</a>"
            )

            sent_to_this_crew = set()
            
            for reg_name, chat_id in telegram_users.items():
                if not reg_name:
                    continue
                
                if (reg_name in driver_str or reg_name in expeditor_str or 
                    (driver_str and driver_str in reg_name) or 
                    (expeditor_str and expeditor_str in reg_name)):
                    
                    if chat_id not in sent_to_this_crew:
                        send_telegram_message(chat_id, message_text)
                        sent_to_this_crew.add(chat_id)
                        notified_count += 1

        return {
            "status": "success",
            "found_crews": len(crews_today),
            "notified_users": notified_count,
            "registered_telegram_users": len(telegram_users)
        }
    except Exception as e:
        print(f"❌ Ошибка в notify_drivers: {str(e)}")
        return {"status": "error", "message": f"Ошибка сервера: {str(e)}"}