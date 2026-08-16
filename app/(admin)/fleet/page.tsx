"use client";

import { useState, useEffect } from "react";
import { Car, CarStatus } from "@/lib/data";
import { Search, Plus, Loader2 } from "lucide-react";
import { Button, Tabs, Input, useToast, Modal } from "@/components/ui";
import { useAdmin } from "@/contexts/AdminContext";
import { vehicleService, attachmentService } from "@/lib/api-services";
import {
  T,
  emptyVehicleForm,
  mapVehicleToForm,
  extractVehicleImageFileIds,
  buildVehiclePayload,
  validateStep,
  mapStatusFromBackend,
  STATUS_TABS,
  STATS,
} from "@/lib/fleet";
import { useVehicleLookups } from "@/hooks/useVehicleLookups";
import { CarCard } from "@/components/fleet/CarCard";
import { VehicleDetailsPage } from "@/components/fleet/VehicleDetailsPage";

export default function FleetPage() {
  const { dir } = useAdmin();
  const ar = dir === "rtl";
  const { showToast } = useToast();

  const [tab, setTab] = useState<"all" | CarStatus>("all");
  const [search, setSearch] = useState("");
  const [vehicles, setVehicles] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);

  const [isDetailsOpen, setDetailsOpen] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>(emptyVehicleForm());

  const [vehicleImages, setVehicleImages] = useState<File[]>([]);
  const [vehicleImagePreviews, setVehicleImagePreviews] = useState<string[]>([]);
  const [existingImageFileIds, setExistingImageFileIds] = useState<number[]>([]);

  const [deleteTarget, setDeleteTarget] = useState<Car | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { makes, models, branches, plateTypes, insuranceCompanies, insuranceTypes } =
    useVehicleLookups(form.makeId);

  // Load vehicles from API
  useEffect(() => {
    loadVehicles();
  }, [tab, search]);

  const resetForm = () => {
    setForm(emptyVehicleForm());
    setVehicleImages([]);
    setVehicleImagePreviews([]);
    setExistingImageFileIds([]);
  };

  const handleAddVehicle = () => {
    setEditingVehicleId(null);
    resetForm();
    setDetailsOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newImages = [...vehicleImages, ...files];
    const newPreviews = [...vehicleImagePreviews, ...files.map((f) => URL.createObjectURL(f))];
    setVehicleImages(newImages);
    setVehicleImagePreviews(newPreviews);
  };

  const removeExistingImage = (fileId: number) => {
    setExistingImageFileIds((prev) => prev.filter((id) => id !== fileId));
  };

  const removeImage = (index: number) => {
    setVehicleImages((prev) => prev.filter((_, i) => i !== index));
    setVehicleImagePreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleEditVehicle = async (car: Car) => {
    setEditingVehicleId(car.id);
    setVehicleImages([]);
    setVehicleImagePreviews([]);
    try {
      const v = await vehicleService.getById(car.id);
      console.log("Vehicle detail response:", v);
      setExistingImageFileIds(extractVehicleImageFileIds(v));
      setForm(mapVehicleToForm(v));
      setDetailsOpen(true);
    } catch (error) {
      console.error("Error loading vehicle details:", error);
      showToast(T("Failed to load vehicle details", "فشل تحميل تفاصيل السيارة", ar));
      setEditingVehicleId(null);
    }
  };

  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    for (let s = 1; s <= 4; s++) {
      if (!validateStep(form, s, ar, showToast)) {
        return;
      }
    }

    setSaving(true);
    try {
      // Upload selected vehicle images first, then merge with existing ones
      let newImageFileIds: number[] = [];
      if (vehicleImages.length > 0) {
        const branchId = form.branchId ? Number(form.branchId) : undefined;
        const uploadResults = await Promise.all(
          vehicleImages.map((file) => attachmentService.upload(file, branchId))
        );
        console.log("Attachment upload results:", uploadResults);
        newImageFileIds = uploadResults
          .map((res: any) => res?.data?.id ?? res?.id ?? res?.fileId ?? res?.data?.fileId)
          .filter((id): id is number => typeof id === "number");

        if (newImageFileIds.length !== vehicleImages.length) {
          throw new Error(
            T(
              "Some images failed to upload",
              "فشل تحميل بعض الصور",
              ar
            )
          );
        }
      }

      const imageFileIds = [...existingImageFileIds, ...newImageFileIds];
      const payload = buildVehiclePayload(form, imageFileIds);
      console.log("Vehicle payload:", JSON.stringify(payload, null, 2));
      if (editingVehicleId) {
        await vehicleService.update(editingVehicleId, payload);
        showToast(T("🟢 Vehicle updated successfully!", "🟢 تم تحديث السيارة بنجاح!", ar));
      } else {
        // Create vehicle without images first; the backend appears to fail when images
        // are sent alongside a null id. Then attach images in a second update call.
        const createPayload = { ...payload, images: [] };
        console.log("Vehicle create base payload:", JSON.stringify(createPayload, null, 2));
        const created = await vehicleService.create(createPayload);
        console.log("Vehicle created:", created);
        const vehicleId = created?.id ?? created?.data?.id;
        if (imageFileIds.length > 0) {
          if (!vehicleId) {
            throw new Error(
              T(
                "Vehicle created but no ID returned. Could not attach images.",
                "تم إنشاء السيارة ولكن لم يتم إرجاع المعرف. تعذر إرفاق الصور.",
                ar
              )
            );
          }
          console.log("Attaching images to vehicle:", vehicleId);
          await vehicleService.update(vehicleId, payload);
        }
        showToast(T("🟢 Vehicle created successfully!", "🟢 تم إضافة السيارة بنجاح!", ar));
      }
      setDetailsOpen(false);
      setEditingVehicleId(null);
      resetForm();
      await loadVehicles();
    } catch (error: any) {
      console.error("Error saving vehicle:", error);
      const msg = error?.message || error?.response?.message || "Failed to save vehicle";
      showToast(T(msg, msg, ar));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteVehicle = (car: Car) => {
    setDeleteTarget(car);
  };

  const confirmDeleteVehicle = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      await vehicleService.delete(deleteTarget.id);
      showToast(T("🗑️ Vehicle deleted", "🗑️ تم حذف السيارة", ar));
      setDeleteTarget(null);
      await loadVehicles();
    } catch (error) {
      console.error("Error deleting vehicle:", error);
      showToast(T("Failed to delete vehicle", "فشل حذف السيارة", ar));
    } finally {
      setDeleting(false);
    }
  };

  const loadVehicles = async () => {
    try {
      setLoading(true);
      const searchRequest: any = {
        pageNumber: 1,
        pageSize: 100,
      };
      if (search) {
        searchRequest.search = search;
      }
      if (tab !== "all") {
        const statusMap: Record<CarStatus, number> = {
          available: 1,
          rented: 2,
          overdue: 3,
          maintenance: 4,
          reserved: 5,
          inactive: 6,
          draft: 7,
        };
        searchRequest.status = statusMap[tab];
      }
      const response = await vehicleService.search(searchRequest);
      console.log("Vehicles API response:", response);

      const searchItems = response.items || response.data || [];
      const detailedVehicles = await Promise.all(
        searchItems.map(async (item: any) => {
          try {
            return await vehicleService.getById(item.id);
          } catch (error) {
            console.warn("Failed to load vehicle details for id", item.id, error);
            return item;
          }
        })
      );

      console.log("Vehicles detail responses:", detailedVehicles);
      const transformedVehicles = detailedVehicles.map((item: any) => ({
        id: item.id,
        name: `${item.makeName || ""} ${item.modelName || ""} ${item.year || ""}`.trim(),
        plate: item.plateNumber || "",
        make: item.makeName || "",
        model: item.modelName || "",
        type: item.bodyType || "",
        color: item.color || "",
        year: item.year ,
        status: mapStatusFromBackend(item.status),
        customer: item.customerName,
        returnTime: item.returnTime,
        speed: item.speed,
        location: item.location,
        mapX: item.mapX,
        mapY: item.mapY,
        dailyRate: item.dailyRate || 0,
        kmCap: item.kmCap,
        utilization: item.utilization || 0,
        plateNumber: item.plateNumber,
        plateChar1: item.plateChar1,
        plateChar2: item.plateChar2,
        plateChar3: item.plateChar3,
        chassisNumber: item.chassisNumber,
        fuelTypeCode: item.fuelTypeCode,
        extraKmCost: item.extraKmCost,
        fullFuelCost: item.fullFuelCost,
        lateFeePerHour: item.lateFeePerHour,
        enduranceAmount: item.enduranceAmount,
        bodyType: item.bodyType,
        seats: item.seats,
        transmission: item.transmission,
        istamaraNumber: item.istamaraNumber,
        istamaraExpiry: item.istamaraExpiry,
        periodicInspectionExpiry: item.periodicInspectionExpiry,
        insuranceCompany: item.insuranceCompany,
        insurancePolicyNumber: item.insurancePolicyNumber,
        insuranceExpiry: item.insuranceExpiry,
        insuranceType: item.insuranceType,
        registrationTypeCode: item.registrationTypeCode,
        operationCardNumber: item.operationCardNumber,
        operationCardExpiryDate: item.operationCardExpiryDate,
        oilChangeDate: item.oilChangeDate,
        insuranceAmount: item.insuranceAmount,
        otherNotes: item.otherNotes,
        imageUrls: item.images?.length
          ? item.images
              .filter((img: any) => {
                const fileId = img.fileId ?? img.id ?? img.attachmentId;
                const valid = typeof fileId === "number" && fileId > 0;
                if (!valid) console.warn("Vehicle image without valid fileId:", img);
                return valid;
              })
              .sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
              .map((img: any) => `/api/attachments/${img.fileId ?? img.id ?? img.attachmentId}/download`)
          : undefined,
      }));
      setVehicles(transformedVehicles);
    } catch (error) {
      console.error("Error loading vehicles:", error);
      
    } finally {
      setLoading(false);
    }
  };

  const visible = vehicles.filter((c) => {
    const matchTab = tab === "all" || c.status === tab;
    const needle = search.trim().toLowerCase();
    const haystack = [
      c.name,
      c.plate,
      c.make,
      c.model,
      c.customer,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const matchSearch = !needle || haystack.includes(needle);
    return matchTab && matchSearch;
  });

  const counts: Record<string, number> = {
    total: vehicles.length,
    available: vehicles.filter((c) => c.status === "available").length,
    rented: vehicles.filter((c) => c.status === "rented").length,
    overdue: vehicles.filter((c) => c.status === "overdue").length,
    maintenance: vehicles.filter((c) => c.status === "maintenance").length,
    reserved: vehicles.filter((c) => c.status === "reserved").length,
    inactive: vehicles.filter((c) => c.status === "inactive").length,
  };

  if (isDetailsOpen) {
    return (
      <VehicleDetailsPage
        editingVehicleId={editingVehicleId}
        saving={saving}
        form={form}
        setForm={setForm}
        makes={makes}
        models={models}
        plateTypes={plateTypes}
        branches={branches}
        insuranceCompanies={insuranceCompanies}
        insuranceTypes={insuranceTypes}
        vehicleImages={vehicleImages}
        vehicleImagePreviews={vehicleImagePreviews}
        existingImageFileIds={existingImageFileIds}
        onImageChange={handleImageChange}
        onRemoveImage={removeImage}
        onRemoveExistingImage={removeExistingImage}
        onBack={() => {
          setDetailsOpen(false);
          setEditingVehicleId(null);
          resetForm();
        }}
        onSubmit={handleSaveVehicle}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {STATS.map(({ labelEn, labelAr, key, cls }) => (
          <div key={key} className="rounded-md border border-mk-ink-100 p-4 flex flex-col gap-1 mk-surface">
            <span className={`mk-h2 leading-none ${cls}`}>{counts[key]}</span>
            <span className="mk-caption normal-case tracking-normal text-mk-ink-500">
              {ar ? labelAr : labelEn}
            </span>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div className="rounded-md border border-mk-ink-100 flex flex-col overflow-hidden mk-surface">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-mk-ink-100 gap-4">
          {/* Status tabs */}
          <Tabs
            variant="default"
            rounded="full"
            className="normal-case tracking-normal"
            value={tab}
            onChange={(v) => setTab(v as typeof tab)}
            items={STATUS_TABS.map((t) => ({
              value: t.key,
              label: (
                <>
                  {ar ? t.labelAr : t.labelEn}
                  {t.key !== "all" && (
                    <span className="ms-1 mk-overline normal-case tracking-normal opacity-80">
                      ({counts[t.key] ?? 0})
                    </span>
                  )}
                </>
              ),
            }))}
          />

          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="min-w-48">
              <Input
                variant="search"
                icon={<Search size={14} />}
                className="!rounded-sm !bg-mk-ink-50 !border-mk-ink-200"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={T("Search by name or plate…", "بحث بالاسم أو اللوحة...", ar)}
              />
            </div>
            {/* Add car */}
            <Button
              variant="primary"
              size="sm"
              className="rounded-sm shadow-[var(--shadow-glow-blue)] normal-case tracking-normal"
              onClick={handleAddVehicle}
            >
              <Plus size={14} />
              {T("Add car", "إضافة سيارة", ar)}
            </Button>
          </div>
        </div>

        {/* Grid */}
        <div
          className="p-4 grid gap-3"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}
        >
          {loading ? (
            <div className="col-span-full flex items-center justify-center py-12 rounded-xl mk-surface">
              <Loader2 className="animate-spin text-mk-blue-500" size={32} />
            </div>
          ) : visible.length === 0 ? (
            <div className="col-span-full text-center py-12 mk-label text-mk-ink-400">
              {T("No matching cars", "لا توجد سيارات مطابقة", ar)}
            </div>
          ) : (
            visible.map((car) => (
              <CarCard key={car.id} car={car} onEdit={handleEditVehicle} onDelete={handleDeleteVehicle} />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-mk-ink-100 mk-caption text-mk-ink-500">
          <span>
            {T(`Showing ${visible.length} of ${vehicles.length} cars`, `عرض ${visible.length} من ${vehicles.length} سيارة`, ar)}
          </span>
        </div>
      </div>

      <Modal
        open={!!deleteTarget}
        onClose={() => !deleting && setDeleteTarget(null)}
        variant="centered"
        size="sm"
        title={T("Delete vehicle", "حذف السيارة", ar)}
      >
        <div className="p-5 flex flex-col gap-5">
          <p className="mk-body-sm text-mk-ink-700">
            {T(
              `Are you sure you want to delete "${deleteTarget?.name ?? ""}"? This action cannot be undone.`,
              `هل أنت متأكد من حذف "${deleteTarget?.name ?? ""}"؟ لا يمكن التراجع عن هذا الإجراء.`,
              ar
            )}
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              {T("Cancel", "إلغاء", ar)}
            </Button>
            <Button variant="danger" size="sm" onClick={confirmDeleteVehicle} disabled={deleting}>
              {deleting ? <Loader2 size={14} className="animate-spin" /> : null}
              {T("Delete", "حذف", ar)}
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
