import io
import math
import re
import time
import pandas as pd
import requests
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Logistics App API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SPREADSHEET_URL = "https://docs.google.com/spreadsheets/d/1nGRnER-mQj81NugFTaR1rBP87w8a00riPXBFqZDU1dI/edit?gid=0#gid=0"

# GID листа с детализацией (бывший "Лист4", теперь "Адреса")
DETAILS_GID = "1361088490"

# Захардкоренные точные координаты склада (ул. Полярная, 20, Киев)
WAREHOUSE_LAT = 50.5181
WAREHOUSE_LON = 30.4727


def get_coordinates(city: str, street: str, house: str):
    """Получает координаты через структурированный поиск Nominatim с соблюдением лимитов"""
    city_clean = re.sub(r'\([^)]*\)', '', city).strip()
    street_clean = re.sub(r'\([^)]*\)', '', street).replace('ул.', '').strip()
    house_clean = str(house).strip()
    
    if not city_clean and not street_clean:
        return None, None
    
    url = "https://nominatim.openstreetmap.org/search"
    
    params = {
        "city": city_clean,
        "street": f"{street_clean} {house_clean}".strip(),
        "country": "Ukraine",
        "format": "json",
        "limit": 1
    }
    
    headers = {
        "User-Agent": "VegtamLogisticsApp/1.0 (vegtam.logistics@gmail.com)"
    }
    
    try:
        time.sleep(1.5)
        response = requests.get(url, params=params, headers=headers, timeout=5)
        
        if response.status_code == 200:
            results = response.json()
            if results:
                lat = float(results[0]["lat"])
                lon = float(results[0]["lon"])
                return lat, lon
            else:
                return get_coordinates_fallback(city_clean)
        else:
            print(f"❌ Ошибка Nominatim (код {response.status_code}) для города: {city_clean}")
            
    except Exception as e:
        print(f"❌ Ошибка запроса к геокодеру:", e)
        
    return None, None


def get_coordinates_fallback(city_name: str):
    """Запасной вариант поиска только по городу"""
    if not city_name:
        return None, None
    url = "https://nominatim.openstreetmap.org/search"
    params = {"city": city_name, "country": "Ukraine", "format": "json", "limit": 1}
    headers = {"User-Agent": "VegtamLogisticsApp/1.0 (vegtam.logistics@gmail.com)"}
    try:
        time.sleep(1.0)
        resp = requests.get(url, params=params, headers=headers, timeout=5)
        if resp.status_code == 200 and resp.json():
            return float(resp.json()[0]["lat"]), float(resp.json()[0]["lon"])
    except Exception:
        pass
    return None, None


def calculate_distance(lat1, lon1, lat2, lon2):
    """Считает расстояние в километрах между двумя точками по формуле Haversine"""
    if None in (lat1, lon1, lat2, lon2):
        return float('inf')
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 + 
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * 
         math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def get_sheet_data(gid="0"):
    """Считывает данные с любого листа по его gid"""
    try:
        sheet_id = SPREADSHEET_URL.split("/d/")[1].split("/")[0]
        export_url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/export?format=csv&id={sheet_id}&gid={gid}"

        response = requests.get(export_url, timeout=10)
        response.encoding = "utf-8"

        if response.status_code != 200:
            print(f"❌ Ошибка доступа к листу (gid: {gid}, код {response.status_code})")
            return []

        df = pd.read_csv(io.StringIO(response.text))
        df = df.fillna("")
        return df.to_dict(orient="records")

    except Exception as e:
        print(f"❌ Ошибка при чтении листа (gid: {gid}):", e)
        return []


@app.get("/")
def home():
    return {"status": "online"}


@app.get("/api/routes-by-vehicle")
def get_routes_by_vehicle():
    data = get_sheet_data(gid="0")
    if not data:
        print("⚠️ Таблица пуста или не удалось прочитать данные!")
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

    warehouse_lat, warehouse_lon = WAREHOUSE_LAT, WAREHOUSE_LON

    grouped = {}
    for row in data:
        raw_val = str(row.get(vehicle_column, "")).strip()

        if raw_val.endswith(".0"):
            raw_val = raw_val[:-2]

        if not raw_val or raw_val.lower() in ["nan", "none", "null"]:
            vehicle_key = "Без номера авто"
        else:
            vehicle_key = raw_val

        if vehicle_key not in grouped:
            grouped[vehicle_key] = []
        
        city = str(row.get("Факт.Місто доставки", ""))
        street = str(row.get("Вулиця", ""))
        house = str(row.get("№ будинку", ""))

        lat, lon = get_coordinates(city, street, house)
        distance = calculate_distance(warehouse_lat, warehouse_lon, lat, lon)
        row["calculated_distance"] = round(distance, 1) if distance != float('inf') else None
        
        addr_text = f"{city}, {street} {house}".strip()
        print(f"📍 Адрес: {addr_text} | Координаты: {lat}, {lon} | Расстояние: {row['calculated_distance']} км")

        grouped[vehicle_key].append(row)

    for vehicle_key in grouped:
        grouped[vehicle_key].sort(key=lambda x: x["calculated_distance"] if x["calculated_distance"] is not None else 999999)

    return grouped


@app.get("/api/delivery-details/{doc_id}")
def get_delivery_details(doc_id: str):
    """Возвращает подробный список товаров и получателя с листа 'Адреса' по № док-ту"""
    details_data = get_sheet_data(gid=DETAILS_GID)
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