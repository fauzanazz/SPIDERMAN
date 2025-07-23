from pydantic import BaseModel, Field, HttpUrl
from typing import List, Optional, Dict, Any

# --- Request models ---
class TaskRequest(BaseModel):
    data: dict

class SitusJudiRequest(BaseModel):
    url: HttpUrl = Field(..., description="URL situs judi online yang akan dianalisis")
    
class MultipleSitusRequest(BaseModel):
    urls: List[HttpUrl] = Field(..., description="Daftar URL situs judi online yang akan dianalisis")

class ReportRequest(BaseModel):
    nomor_rekening: str = Field(..., description="Nomor rekening untuk laporan")
    pemilik_rekening: str = Field(..., description="Nama pemilik rekening")
    nama_bank: str = Field(..., description="Nama bank")
    oss_key: str = Field(..., description="Key untuk mengakses gambar di storage")

class TaskResponse(BaseModel):
    task_id: str

class TaskStatus(BaseModel):
    task_id: str
    status: str
    result: dict | None

# --- Response models ---
class SitusJudiResponse(BaseModel):
    status: str = Field(..., description="Status pemrosesan")
    url: str = Field(..., description="URL yang diproses")
    task_id: str = Field(..., description="ID task Celery")
    processing_time: Optional[float] = Field(None, description="Waktu pemrosesan dalam detik")
    rekening_ditemukan: Optional[int] = Field(None, description="Jumlah rekening mencurigakan yang ditemukan")
    crypto_ditemukan: Optional[int] = Field(None, description="Jumlah wallet crypto yang ditemukan")
    payment_ditemukan: Optional[int] = Field(None, description="Jumlah metode pembayaran yang ditemukan")
    nama_situs: Optional[str] = Field(None, description="Nama situs")
    error_message: Optional[str] = Field(None, description="Pesan error jika pemrosesan gagal")

class MultipleSitusResponse(BaseModel):
    status: str = Field(..., description="Status pemrosesan keseluruhan")
    task_id: str = Field(..., description="ID task Celery")
    processing_time: float = Field(..., description="Total waktu pemrosesan dalam detik")
    total_situs: int = Field(..., description="Total jumlah situs yang diproses")
    berhasil_ekstraksi: int = Field(..., description="Jumlah ekstraksi yang berhasil")
    gagal_ekstraksi: int = Field(..., description="Jumlah ekstraksi yang gagal")
    results: List[Dict[str, Any]] = Field(..., description="Hasil pemrosesan individual situs")
    error_message: Optional[str] = Field(None, description="Pesan error jika batch processing gagal")

class AkunMencurigakan(BaseModel):
    akun: Dict[str, Any] = Field(..., description="Detail akun mencurigakan")
    situs_judi: List[str] = Field(..., description="Situs judi yang menggunakan akun ini")

class DaftarAkunResponse(BaseModel):
    status: str = Field(..., description="Status query")
    akun_mencurigakan: List[AkunMencurigakan] = Field(..., description="Daftar akun mencurigakan")
    jumlah: int = Field(..., description="Jumlah akun mencurigakan yang ditemukan")
    error_message: Optional[str] = Field(None, description="Pesan error jika query gagal")

class JaringanSitus(BaseModel):
    situs1: str = Field(..., description="URL situs judi pertama")
    situs2: str = Field(..., description="URL situs judi kedua")
    rekening_sama: str = Field(..., description="Nomor rekening yang digunakan bersama")
    bank: str = Field(..., description="Nama bank")

class JaringanSitusResponse(BaseModel):
    status: str = Field(..., description="Status query")
    jaringan: List[JaringanSitus] = Field(..., description="Daftar jaringan situs judi")
    jumlah: int = Field(..., description="Jumlah koneksi jaringan yang ditemukan")
    error_message: Optional[str] = Field(None, description="Pesan error jika query gagal")

class StatistikSitus(BaseModel):
    situs: Dict[str, Any] = Field(..., description="Informasi situs")
    jumlah_rekening: int = Field(..., description="Jumlah rekening")
    jumlah_crypto: int = Field(..., description="Jumlah wallet crypto")
    jumlah_payment: int = Field(..., description="Jumlah metode pembayaran")
    bank_list: List[str] = Field(..., description="Daftar bank yang ditemukan")

class StatistikSitusResponse(BaseModel):
    status: str = Field(..., description="Status query")
    statistik: Optional[StatistikSitus] = Field(None, description="Statistik situs")
    error_message: Optional[str] = Field(None, description="Pesan error jika query gagal")

# Health check response
class HealthResponse(BaseModel):
    status: str = Field(..., description="Status kesehatan service")
    timestamp: str = Field(..., description="Timestamp health check")
    database_connected: bool = Field(..., description="Status koneksi database Neo4j")
    celery_connected: bool = Field(..., description="Status koneksi Celery broker")