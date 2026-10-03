"use client";

import { useState, useEffect } from "react";
import { Car, CarStatus } from "@/lib/data";
import { Loader2 } from "lucide-react";
import { useToast, Modal, Button } from "@/components/ui";
import { useAdmin } from "@/contexts/AdminContext";
import { vehicleService, attachmentService } from "@/lib/api-services";
import {
  T,
  emptyVehicleForm,
  mapVehicleToForm,
  extractVehicleImageFileIds,
  buildVehiclePayload,
  validateStep,
  extractVehicleValidationErrors,
} from "@/lib/fleet";
import { mapBackendVehicleToCar } from "@/components/shared/contracts/new-contract/mappers";
import { describeApiError } from "@/lib/api-error-messages";
import { useVehicleLookups } from "@/hooks/useVehicleLookups";
import { FleetVehicleList } from "@/components/fleet/FleetVehicleList";
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<any>(emptyVehicleForm());

  const [vehicleImages, setVehicleImages] = useState<File[]>([]);
  const [vehicleImagePreviews, setVehicleImagePreviews] = useState<string[]>([]);
  const [existingImageFileIds, setExistingImageFileIds] = useState<number[]>([]);

  const [deleteTarget, setDeleteTarget] = useState<Car | null>(null);
  const [deleting, setDeleting] = useState(false);

  const setVehicleForm: React.Dispatch<React.SetStateAction<any>> = (action) => {
    setForm((previous: any) => {
      const next = typeof action === "function" ? action(previous) : action;
      const changedFields = Object.keys(next).filter((field) => next[field] !== previous[field]);
      if (changedFields.length > 0) {
        setFieldErrors((current) => {
          const remaining = { ...current };
          changedFields.forEach((field) => delete remaining[field]);
          return remaining;
        });
      }
      return next;
    });
  };

  const { makes, models, branches, plateTypes, insuranceCompanies, insuranceTypes } =
    useVehicleLookups(form.makeId);

  // Load vehicles from API
  useEffect(() => {
    loadVehicles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setFieldErrors({});
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

    setFieldErrors({});
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
      const validationErrors = extractVehicleValidationErrors(error);
      setFieldErrors(validationErrors);
      // Always toast — field errors may sit on a hidden wizard step/panel.
      showToast(describeApiError(error, ar, T("Failed to save vehicle", "فشل حفظ السيارة", ar)), "error");
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
      showToast(describeApiError(error, ar, T("Failed to delete vehicle", "فشل حذف السيارة", ar)), "error");
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
      // Status is filtered client-side (see `visible` below) so per-tab
      // counts stay accurate on a single unfiltered fetch.
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
      const transformedVehicles = detailedVehicles.map((item: any) => mapBackendVehicleToCar(item?.data ?? item));
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
    draft: vehicles.filter((c) => c.status === "draft").length,
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
        setForm={setVehicleForm}
        fieldErrors={fieldErrors}
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
    <div>
      <FleetVehicleList
        vehicles={vehicles}
        visibleVehicles={visible}
        loading={loading}
        tab={tab}
        search={search}
        counts={counts}
        onTabChange={setTab}
        onSearchChange={setSearch}
        onAdd={handleAddVehicle}
        onEdit={handleEditVehicle}
        onDelete={handleDeleteVehicle}
      />

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
