"use client";

import { useState, useEffect } from "react";
import { Plus, Loader2, Shield, Edit, Trash2 } from "lucide-react";
import { Button, Table, Th, Td, Drawer, DrawerHeader, DrawerFooter, useToast, Input } from "@/components/ui";
import { useAdmin } from "@/contexts/AdminContext";
import { tenantRoleService } from "@/lib/api-services";

const T = (en: string, ar: string, isAr: boolean) => (isAr ? ar : en);

export default function RolesPage() {
  const { dir } = useAdmin();
  const ar = dir === "rtl";

  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [isEditDrawerOpen, setEditDrawerOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const { showToast } = useToast();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // Mock data - TODO: Replace with API when backend is ready
  const MOCK_ROLES = [
    {
      id: 1,
      name: "Owner",
      nameAr: "المالك",
      description: "Full platform access",
      descriptionAr: "صلاحية كاملة للمنصة",
      status: "Active",
      permissionsCount: 35,
    },
    {
      id: 2,
      name: "Manager",
      nameAr: "مدير",
      description: "Branch operations and reports",
      descriptionAr: "عمليات الفرع والتقارير",
      status: "Active",
      permissionsCount: 20,
    },
    {
      id: 3,
      name: "Front Desk",
      nameAr: "موظف استقبال",
      description: "Contract creation and customer management",
      descriptionAr: "إنشاء العقود وإدارة العملاء",
      status: "Active",
      permissionsCount: 12,
    },
    {
      id: 4,
      name: "Accountant",
      nameAr: "محاسب",
      description: "Financial reports and refunds",
      descriptionAr: "التقارير المالية والمستردات",
      status: "Active",
      permissionsCount: 8,
    },
  ];

  // Load roles from API
  useEffect(() => {
    loadRoles();
  }, []);

  // Load permissions from API
  useEffect(() => {
    loadPermissions();
  }, []);

  const loadRoles = async () => {
    try {
      setLoading(true);
      const response = await tenantRoleService.search({});
      const transformedRoles = (response.items || response.data || []).map((item: any) => ({
        id: item.id,
        name: item.name || '',
        description: item.description || '',
        status: item.isActive !== false ? 'Active' : 'Inactive',
        permissionsCount: item.permissions?.length || 0,
      }));
      setRoles(transformedRoles);
    } catch (error) {
      console.error('Error loading roles:', error);
      showToast(T('Failed to load roles', 'فشل تحميل الأدوار', ar));
      setRoles([]);
    } finally {
      setLoading(false);
    }
  };

  const loadPermissions = async () => {
    try {
      const response = await tenantRoleService.getPermissions();
      setPermissions(response);
    } catch (error) {
      console.error('Error loading permissions:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(ar ? 'هل أنت متأكد من حذف هذا الدور؟' : 'Are you sure you want to delete this role?')) {
      return;
    }

    try {
      await tenantRoleService.delete(id);
      loadRoles();
      showToast(T("Role deleted successfully", "تم حذف الدور بنجاح", ar));
    } catch (error: any) {
      console.error('Error deleting role:', error);
      const rawMsg: string = error?.message || error?.response?.error || '';
      let msg = ar ? 'فشل حذف الدور' : 'Failed to delete role';
      if (/assigned to users/i.test(rawMsg)) {
        msg = ar
          ? 'لا يمكن حذف دور مُسند إلى مستخدمين'
          : 'Cannot delete a role that is assigned to users';
      } else if (rawMsg) {
        msg = rawMsg;
      }
      showToast(msg);
    }
  };

  const handleEditRole = (role: any) => {
    setEditingRole(role);
    setName(role.name || "");
    setDescription(role.description || "");
    setSelectedPermissions([]);
    setEditDrawerOpen(true);
  };

  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || selectedPermissions.length === 0) {
      showToast(T("Please fill all mandatory fields", "الرجاء تعبئة الحقول الإلزامية", ar));
      return;
    }

    try {
      await tenantRoleService.update(editingRole.id, {
        name,
        description,
        permissions: selectedPermissions,
      });

      // Reload roles list
      await loadRoles();
      setEditDrawerOpen(false);
      setEditingRole(null);
      setName("");
      setDescription("");
      setSelectedPermissions([]);
      showToast(T("🟢 Role updated successfully!", "🟢 تم تحديث الدور بنجاح!", ar));
    } catch (error) {
      console.error('Error updating role:', error);
      showToast(T('Failed to update role', 'فشل تحديث الدور', ar));
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      showToast(T("Please fill all mandatory fields", "الرجاء تعبئة الحقول الإلزامية", ar));
      return;
    }

    try {
      await tenantRoleService.create({
        name,
        description,
        permissions: selectedPermissions,
      });

      // Reload roles list
      await loadRoles();
      setDrawerOpen(false);
      setName("");
      setDescription("");
      setSelectedPermissions([]);
      showToast(T("🟢 Role created successfully!", "🟢 تم إضافة الدور الجديد بنجاح!", ar));
    } catch (error) {
      console.error('Error creating role:', error);
      showToast(T('Failed to create role', 'فشل إنشاء الدور', ar));
    }
  };

  const togglePermission = (permissionValue: string) => {
    setSelectedPermissions(prev =>
      prev.includes(permissionValue)
        ? prev.filter(p => p !== permissionValue)
        : [...prev, permissionValue]
    );
  };

  const togglePagePermissions = (pagePermissions: any[]) => {
    const allValues = pagePermissions.map(p => p.value);
    const allSelected = allValues.every(v => selectedPermissions.includes(v));
    
    setSelectedPermissions(prev =>
      allSelected
        ? prev.filter(p => !allValues.includes(p))
        : [...new Set([...prev, ...allValues])]
    );
  };

  const isPageFullySelected = (pagePermissions: any[]) => {
    const allValues = pagePermissions.map(p => p.value);
    return allValues.every(v => selectedPermissions.includes(v));
  };

  const isPagePartiallySelected = (pagePermissions: any[]) => {
    const allValues = pagePermissions.map(p => p.value);
    const selectedCount = allValues.filter(v => selectedPermissions.includes(v)).length;
    return selectedCount > 0 && selectedCount < allValues.length;
  };

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center gap-3 mb-5">
        <div className="mk-h4 flex-1 text-mk-ink-900">
          {T("Roles", "الأدوار", ar)}
        </div>
        <Button
          variant="primary"
          className="shadow-[var(--shadow-glow-blue)]"
          onClick={() => setDrawerOpen(true)}
        >
          <Plus size={14} />
          {T("Add role", "إضافة دور", ar)}
        </Button>
      </div>

      {/* Roles table */}
      <div className="rounded-xl overflow-hidden mk-surface">
        <Table>
          <thead>
            <tr>
              {[
                T("Role", "الدور", ar),
                T("Description", "الوصف", ar),
                "",
              ].map((h, i) => <Th key={i}>{h}</Th>)}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} className="text-center py-12">
                  <Loader2 className="animate-spin text-mk-blue-500 mx-auto" size={32} />
                </td>
              </tr>
            ) : roles.length === 0 ? (
              <tr>
                <td colSpan={3} className="text-center py-12 mk-label text-mk-ink-400">
                  {T("No roles found", "لم يتم العثور على أدوار", ar)}
                </td>
              </tr>
            ) : (
              roles.map((role) => (
                <tr key={role.id} className="cursor-pointer transition-[background-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-mk-ink-50" onClick={() => handleEditRole(role)}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-mk-blue-100 flex items-center justify-center">
                        <Shield size={20} className="text-mk-blue-600" />
                      </div>
                      <div>
                        <div className="mk-body text-mk-ink-900">
                          {role.name}
                        </div>
                      </div>
                    </div>
                  </Td>
                  <Td className="mk-label text-mk-ink-700">
                    {role.description}
                  </Td>
                  <Td>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditRole(role)}
                      >
                        <Edit size={14} />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(role.id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </div>

      {/* Create Drawer */}
      <Drawer open={isDrawerOpen} onClose={() => setDrawerOpen(false)}>
        <div className="flex flex-col gap-5 justify-between h-full max-w-[600px]">
          <div>
            <DrawerHeader title={T("Add New Role", "إضافة دور جديد", ar)} onClose={() => setDrawerOpen(false)} className="mb-0 pb-4 border-b border-mk-ink-100" />

            <form onSubmit={handleCreateRole} className="flex flex-col gap-4 mt-5">
              <Input
                label={T("Role Name *", "اسم الدور *", ar)}
                placeholder={T("e.g. Sales Manager", "مثال: مدير مبيعات", ar)}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Input
                label={T("Description", "الوصف", ar)}
                placeholder={T("e.g. Sales team lead", "مثال: قائد فريق المبيعات", ar)}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />

              {/* Permissions Section */}
              <div className="mt-6">
                <div className="mk-body font-semibold text-mk-ink-900 mb-4">
                  {T("Permissions", "الصلاحيات", ar)}
                </div>
                <div className="flex flex-col gap-4 max-h-[400px] overflow-y-auto">
                  {permissions.map((page) => (
                    <div key={page.page} className="border border-mk-ink-100 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <input
                          type="checkbox"
                          id={`page-${page.page}`}
                          checked={isPageFullySelected(page.permissionItems)}
                          onChange={() => togglePagePermissions(page.permissionItems)}
                          className="w-4 h-4"
                        />
                        <label htmlFor={`page-${page.page}`} className="mk-body font-semibold text-mk-ink-900">
                          {page.page}
                        </label>
                      </div>
                      <div className="grid grid-cols-2 gap-2 ml-7">
                        {page.permissionItems.map((perm: any) => (
                          <div key={perm.value} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={perm.value}
                              checked={selectedPermissions.includes(perm.value)}
                              onChange={() => togglePermission(perm.value)}
                              className="w-4 h-4"
                            />
                            <label htmlFor={perm.value} className="mk-caption text-mk-ink-700">
                              {perm.label}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </form>
          </div>

          <DrawerFooter className="mt-0 pt-4 border-t border-mk-ink-100 justify-stretch">
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>
              {T("Cancel", "إلغاء", ar)}
            </Button>
            <Button variant="primary" onClick={handleCreateRole} className="flex-1 shadow-[var(--shadow-glow-blue)]">
              {T("✓ Create Role", "✓ حفظ الدور", ar)}
            </Button>
          </DrawerFooter>
        </div>
      </Drawer>

      {/* Edit Drawer */}
      <Drawer open={isEditDrawerOpen} onClose={() => setEditDrawerOpen(false)}>
        <div className="flex flex-col gap-5 justify-between h-full max-w-[600px]">
          <div>
            <DrawerHeader title={T("Edit Role", "تعديل الدور", ar)} onClose={() => setEditDrawerOpen(false)} className="mb-0 pb-4 border-b border-mk-ink-100" />

            <form onSubmit={handleUpdateRole} className="flex flex-col gap-4 mt-5">
              <Input
                label={T("Role Name *", "اسم الدور *", ar)}
                placeholder={T("e.g. Sales Manager", "مثال: مدير مبيعات", ar)}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Input
                label={T("Description", "الوصف", ar)}
                placeholder={T("e.g. Sales team lead", "مثال: قائد فريق المبيعات", ar)}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />

              {/* Permissions Section */}
              <div className="mt-6">
                <div className="mk-body font-semibold text-mk-ink-900 mb-4">
                  {T("Permissions", "الصلاحيات", ar)}
                </div>
                <div className="flex flex-col gap-4 max-h-[400px] overflow-y-auto">
                  {permissions.map((page) => (
                    <div key={page.page} className="border border-mk-ink-100 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <input
                          type="checkbox"
                          id={`page-edit-${page.page}`}
                          checked={isPageFullySelected(page.permissionItems)}
                          onChange={() => togglePagePermissions(page.permissionItems)}
                          className="w-4 h-4"
                        />
                        <label htmlFor={`page-edit-${page.page}`} className="mk-body font-semibold text-mk-ink-900">
                          {page.page}
                        </label>
                      </div>
                      <div className="grid grid-cols-2 gap-2 ml-7">
                        {page.permissionItems.map((perm: any) => (
                          <div key={perm.value} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`edit-${perm.value}`}
                              checked={selectedPermissions.includes(perm.value)}
                              onChange={() => togglePermission(perm.value)}
                              className="w-4 h-4"
                            />
                            <label htmlFor={`edit-${perm.value}`} className="mk-caption text-mk-ink-700">
                              {perm.label}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </form>
          </div>

          <DrawerFooter className="mt-0 pt-4 border-t border-mk-ink-100 justify-stretch">
            <Button variant="outline" onClick={() => setEditDrawerOpen(false)}>
              {T("Cancel", "إلغاء", ar)}
            </Button>
            <Button variant="primary" onClick={handleUpdateRole} className="flex-1 shadow-[var(--shadow-glow-blue)]">
              {T("✓ Update Role", "✓ تحديث الدور", ar)}
            </Button>
          </DrawerFooter>
        </div>
      </Drawer>
    </div>
  );
}
