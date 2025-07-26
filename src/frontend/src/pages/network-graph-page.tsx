"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Network, Filter, Download, ZoomIn, ZoomOut } from "lucide-react";

export function NetworkGraphPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Kontrol Analisis Jaringan</CardTitle>
          <CardDescription>
            Konfigurasi filter dan pengaturan visualisasi
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="priority-level">Tingkat Prioritas</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Semua tingkat" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Tingkat</SelectItem>
                  <SelectItem value="critical">Kritis</SelectItem>
                  <SelectItem value="high">Prioritas Tinggi</SelectItem>
                  <SelectItem value="medium">Prioritas Menengah</SelectItem>
                  <SelectItem value="low">Prioritas Rendah</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="entity-type">Jenis Entitas</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Semua jenis" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Jenis</SelectItem>
                  <SelectItem value="bank">Rekening Bank</SelectItem>
                  <SelectItem value="ewallet">Dompet Digital</SelectItem>
                  <SelectItem value="qris">Kode QRIS</SelectItem>
                  <SelectItem value="phone">Nomor Telepon</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="time-range">Rentang Waktu</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="30 hari terakhir" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">7 hari terakhir</SelectItem>
                  <SelectItem value="30d">30 hari terakhir</SelectItem>
                  <SelectItem value="90d">90 hari terakhir</SelectItem>
                  <SelectItem value="1y">Tahun lalu</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="search">Cari Entitas</Label>
              <Input placeholder="Masukkan ID entitas..." />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button>
              <Filter className="mr-2 h-4 w-4" />
              Terapkan Filter
            </Button>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Ekspor Graf
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        {/* Graph Visualization */}
        <Card className="col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Graf Jaringan</CardTitle>
                <CardDescription>
                  Visualisasi interaktif hubungan antar entitas
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm">
                  <ZoomOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-muted rounded-lg h-[500px] flex items-center justify-center">
              <div className="text-center">
                <Network className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Graf jaringan interaktif akan ditampilkan di sini
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Menggunakan React Flow atau D3.js untuk visualisasi
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Node Details */}
        <Card>
          <CardHeader>
            <CardTitle>Detail Node</CardTitle>
            <CardDescription>Informasi tentang entitas yang dipilih</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center text-muted-foreground">
              <Network className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">Klik pada node untuk melihat detail</p>
            </div>

            {/* Example node details when selected */}
            <div className="space-y-3 pt-4 border-t">
              <div>
                <h4 className="font-medium">BCA-7829****1234</h4>
                <p className="text-sm text-muted-foreground">Rekening Bank</p>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Skor Prioritas</span>
                <Badge variant="destructive">85</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Koneksi</span>
                <span className="text-sm font-medium">12</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Aktivitas Terakhir</span>
                <span className="text-sm font-medium">2 jam lalu</span>
              </div>
              <Button className="w-full" size="sm">
                Lihat Profil Lengkap
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Graph Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">247</div>
            <p className="text-sm text-muted-foreground">Total Node</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">1,834</div>
            <p className="text-sm text-muted-foreground">Total Koneksi</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">23</div>
            <p className="text-sm text-muted-foreground">
              Kluster Prioritas Tinggi
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">7.4</div>
            <p className="text-sm text-muted-foreground">Rata-rata Koneksi</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
