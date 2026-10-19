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
DETAILS_GID = "1361088490"

WAREHOUSE_LAT = 50.5181
WAREHOUSE_LON = 30.4727

# Кэш в памяти для адресов, чтобы не запрашивать их повторно и избавиться от зависаний
COORDINATES_CACHE = {}


def get_coordinates(city: str, street: str, house: str):
    """Получает координаты с использованием кэша"""
    city_clean = re.sub(r'\([^)]*\)', '', city).strip()
    street_clean = re.sub(r'\([^)]*\)', '', street).replace('ул.', '').strip()
    house_clean = str(house).strip()
    
    cache_key = f"{city_clean}|{street_clean}|{house_clean}"
    if cache_key in COORDINATES_CACHE:
        return COORDINATES_CACHE[cache_key]

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
        time.sleep(1.0)
        response = requests.get(url, params=params, headers=headers, timeout=3)
        
        if response.status_code == 200:
            results = response.json()
            if results:
                lat, lon = float(results[0]["lat"]), float(results[0]["lon"])
                COORDINATES_CACHE[cache_key] = (lat, lon)
                return lat, lon
            else:
                res = get_coordinates_fallback(city_clean)
                COORDINATES_CACHE[cache_key] = res
                return res
        else:
            print(f"❌ Ошибка Nominatim (код {response.status_code})")
    except Exception as e:
        print(f"❌ Ошибка запроса к геокодеру:", e)
        
    COORDINATES_CACHE[cache_key] = (None, None)
    return None, None


def get_coordinates_fallback(city_name: str):
    if not city_name:
        return None, None
    url = "https://nominatim.openstreetmap.org/search"
    params = {"city": city_name, "country": "Ukraine", "format": "json", "limit": 1}
    headers = {"User-Agent": "VegtamLogisticsApp/1.0 (vegtam.logistics@gmail.com)"}
    try:
        time.sleep(0.5)
        resp = requests.get(url, params=params, headers=headers, timeout=3)
        if resp.status_code == 200 and resp.json():
            return float(resp.json()[0]["lat"]), float(resp.json()[0]["lon"])
    except Exception:
        pass
    return None, None


def calculate_distance(lat1, lon1, lat2, lon2):
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
    try:
        sheet_id = SPREADSHEET_URL.split("/d/")[1].split("/")[0]
        export_url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/export?format=csv&id={sheet_id}&gid={gid}"
        response = requests.get(export_url, timeout=10)
        response.encoding = "utf-8"

        if response.status_code != 200:
            return []

        df = pd.read_csv(io.StringIO(response.text))
        df = df.fillna("")
        return df.to_dict(orient="records")
    except Exception as e:
        print(f"❌ Ошибка чтения таблицы (gid: {gid}):", e)
        return []


@app.get("/")
def home():
    return {"status": "online"}


@app.get("/api/routes-by-vehicle")
def get_routes_by_vehicle():
    data = get_sheet_data(gid="0")
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
        
        city = str(row.get("Факт.Місто доставки", ""))
        street = str(row.get("Вулиця", ""))
        house = str(row.get("№ будинку", ""))

        lat, lon = get_coordinates(city, street, house)
        distance = calculate_distance(WAREHOUSE_LAT, WAREHOUSE_LON, lat, lon)
        row["calculated_distance"] = round(distance, 1) if distance != float('inf') else None

        grouped[vehicle_key].append(row)

    for vehicle_key in grouped:
        grouped[vehicle_key].sort(key=lambda x: x["calculated_distance"] if x["calculated_distance"] is not None else 999999)

    return grouped


@app.get("/api/delivery-details/{doc_id}")
def get_delivery_details(doc_id: str):
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