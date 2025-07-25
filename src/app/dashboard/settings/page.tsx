"use client";

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Plus, Edit, Trash } from 'lucide-react';
import { IdCardTemplate } from '@/lib/db/schema';
import { Switch } from '@/components/ui/switch';
import Image from 'next/image';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useAuth } from '@/hooks/use-auth';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_PATH!;

function CoordinateInput({ label, value, onChange }: { label: string, value: { x: number, y: number }, onChange: (v: { x: number, y: number }) => void }) {
  return (
    <div className="flex flex-col gap-1 mb-2">
      <label className="text-xs font-semibold mb-1">{label}</label>
      <div className="flex gap-2 items-end">
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-gray-500">X</span>
          <Input type="number" placeholder="X" value={value?.x ?? ''} onChange={e => onChange({ ...value, x: Number(e.target.value) })} className="w-20" />
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-gray-500">Y</span>
          <Input type="number" placeholder="Y" value={value?.y ?? ''} onChange={e => onChange({ ...value, y: Number(e.target.value) })} className="w-20" />
        </div>
      </div>
    </div>
  );
}
function PhotoDimensionInput({ label, value, onChange }: { label: string, value: { x: number, y: number, width: number, height: number }, onChange: (v: { x: number, y: number, width: number, height: number }) => void }) {
  return (
    <div className="flex flex-col gap-1 mb-2">
      <label className="text-xs font-semibold mb-1">{label}</label>
      <div className="flex gap-2 items-end">
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-gray-500">X</span>
          <Input type="number" placeholder="X" value={value?.x ?? ''} onChange={e => onChange({ ...value, x: Number(e.target.value) })} className="w-16" />
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-gray-500">Y</span>
          <Input type="number" placeholder="Y" value={value?.y ?? ''} onChange={e => onChange({ ...value, y: Number(e.target.value) })} className="w-16" />
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-gray-500">Width</span>
          <Input type="number" placeholder="Width" value={value?.width ?? ''} onChange={e => onChange({ ...value, width: Number(e.target.value) })} className="w-16" />
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-gray-500">Height</span>
          <Input type="number" placeholder="Height" value={value?.height ?? ''} onChange={e => onChange({ ...value, height: Number(e.target.value) })} className="w-16" />
        </div>
      </div>
    </div>
  );
}

function TemplateModal({
  open,
  onOpenChange,
  mode,
  form,
  // file,
  previewUrl,
  academicYears,
  handleFormChange,
  handleFileChange,
  handleSubmit,
  disableAdmissionYear = false,
  // initialPreviewUrl = null,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'add' | 'edit';
  form: Partial<IdCardTemplate>;
  file: File | null;
  previewUrl: string | null;
  academicYears: string[];
  handleFormChange: (field: keyof IdCardTemplate, value: string | number | boolean | object | null) => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: () => void;
  disableAdmissionYear?: boolean;
  initialPreviewUrl?: string | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 min-w-[50vw] mx-auto h-[80vh]">
        <div className="flex flex-col w-[50vw] h-full rounded-lg overflow-hidden">
          {/* Header */}
          <div className="px-6 pt-6 pb-2 border-b sticky top-0 bg-white z-10">
            <DialogTitle>{mode === 'add' ? 'Add ID Card Template' : 'Edit ID Card Template'}</DialogTitle>
          </div>
          {/* Scrollable Content */}
          <div className="flex-1 px-6 py-4 bg-white flex gap-10" style={{ minHeight: 0 }}>
            {/* Left: Form (scrollable) */}
            <div className="flex-1 min-w-0 overflow-y-auto pr-2" style={{ maxHeight: 'calc(80vh - 120px)' }}>
              <div className="mb-4">
                <label className="text-xs font-semibold mb-1">Admission Year</label>
                <Select value={form.admissionYear || ''} onValueChange={v => handleFormChange('admissionYear', v)} disabled={disableAdmissionYear}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Admission Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {academicYears.map((year) => (
                      <SelectItem key={year} value={year}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-4">
                <CoordinateInput label="Name Coordinates" value={form.nameCoordinates || {x:0,y:0}} onChange={v => handleFormChange('nameCoordinates', v)} />
                <CoordinateInput label="Course Coordinates" value={form.courseCoordinates || {x:0,y:0}} onChange={v => handleFormChange('courseCoordinates', v)} />
                <CoordinateInput label="UID Coordinates" value={form.uidCoordinates || {x:0,y:0}} onChange={v => handleFormChange('uidCoordinates', v)} />
                <CoordinateInput label="Mobile Coordinates" value={form.mobileCoordinates || {x:0,y:0}} onChange={v => handleFormChange('mobileCoordinates', v)} />
                <CoordinateInput label="Blood Group Coordinates" value={form.bloodGroupCoordinates || {x:0,y:0}} onChange={v => handleFormChange('bloodGroupCoordinates', v)} />
                <CoordinateInput label="Sports Quota Coordinates" value={form.sportsQuotaCoordinates || {x:0,y:0}} onChange={v => handleFormChange('sportsQuotaCoordinates', v)} />
                <CoordinateInput label="QR Code Coordinates" value={form.qrcodeCoordinates || {x:0,y:0}} onChange={v => handleFormChange('qrcodeCoordinates', v)} />
                <div className="mb-2">
                  <label className="text-xs font-semibold mb-1">QR Code Size</label>
                  <Input type="number" placeholder="QR Code Size" value={form.qrcodeSize || ''} onChange={e => handleFormChange('qrcodeSize', Number(e.target.value))} />
                </div>
                <CoordinateInput label="Valid Till Date Coordinates" value={form.validTillDateCoordinates || {x:0,y:0}} onChange={v => handleFormChange('validTillDateCoordinates', v)} />
                <PhotoDimensionInput label="Photo Dimension" value={form.photoDimension || {x:0,y:0,width:0,height:0}} onChange={v => handleFormChange('photoDimension', v)} />
                <div className="flex items-center gap-2 mt-2">
                  <span>Disabled</span>
                  <Switch checked={!!form.disabled} onCheckedChange={v => handleFormChange('disabled', v)} />
                </div>
              </div>
            </div>
            {/* Right: Image Upload (fixed) */}
            <div className="flex flex-col items-center w-[260px] flex-shrink-0">
              <label className="text-xs font-semibold mb-2">Template Image</label>
              <input type="file" accept="image/*" onChange={handleFileChange} className="mb-2" />
              {previewUrl && (
                <Image src={previewUrl} alt="Preview" width={400} height={250} className="w-full h-auto" />
              )}
            </div>
          </div>
          {/* Footer */}
          <div className="px-6 py-4 border-t sticky bottom-0 bg-white z-10">
            <Button className="w-full" onClick={handleSubmit}>{mode === 'add' ? 'Add' : 'Save'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<IdCardTemplate[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTemplate, setEditTemplate] = useState<IdCardTemplate | null>(null);
  const [form, setForm] = useState<Partial<IdCardTemplate>>({});
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [academicYears, setAcademicYears] = useState<string[]>([]);

  const fetchTemplates = async () => {
    const res = await fetch(`${BASE_URL}/api/id-card-template`);
    if (res.ok) {
      const data = await res.json();
      console.log(data)
      setTemplates(Array.isArray(data.data) ? data.data : []);
    }
  };

  useEffect(() => {
    fetchTemplates();
    // Fetch academic years from backend
    async function fetchYears() {
      const res = await fetch(`${BASE_URL}/api/accademicyear`);
      if (res.ok) {
        const data = await res.json();
        setAcademicYears(Array.isArray(data) ? data : []);
      }
    }
    fetchYears();
  }, []);

  // Fetch and show template image on edit open
  useEffect(() => {
    if (showEditModal && editTemplate) {
      setPreviewUrl(`${BASE_URL}/api/id-card-template/${editTemplate.id}`);
      setFile(null);
    }
  }, [showEditModal, editTemplate]);

  const handleAdd = () => {
    setForm({});
    setShowAddModal(true);
  };

  const handleEdit = (template: IdCardTemplate) => {
    setEditTemplate(template);
    setForm(template);
    setShowEditModal(true);
  };

  const handleDelete = async (id: number | undefined) => {
    if (typeof id !== 'number') return;
    await fetch(`${BASE_URL}/api/id-card-template?id=${id}`, { method: 'DELETE' });
    fetchTemplates();
  };

  const handleFormChange = (field: keyof IdCardTemplate, value: string | number | boolean | object | null) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    if (f) {
      setPreviewUrl(URL.createObjectURL(f));
    } else {
      setPreviewUrl(null);
    }
  };

  const handleAddSubmit = async () => {
    const formData = new FormData();
    // Ensure qrcodeSize is set
    const safeForm = { ...form };
    if (!safeForm.qrcodeSize || isNaN(Number(safeForm.qrcodeSize))) {
      safeForm.qrcodeSize = 190; // Default value
    }
    Object.entries(safeForm).forEach(([key, value]) => {
      formData.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value ?? ''));
    });
    if (file) formData.append('templateFile', file);
    await fetch(`${BASE_URL}/api/id-card-template`, {
      method: 'POST',
      body: formData,
    });
    setShowAddModal(false);
    setFile(null);
    setPreviewUrl(null);
    fetchTemplates();
  };

  const handleEditSubmit = async () => {
    if (!editTemplate) return;
    const formData = new FormData();
    // Object.entries(form).forEach(([key, value]) => {
    //   formData.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value ?? ''));
    // });
    formData.append('templateData', JSON.stringify(form));
    if (file) formData.append('templateFile', file);
    await fetch(`${BASE_URL}/api/id-card-template?id=${editTemplate.id}`, {
      method: 'PUT',
      body: formData,
    });
    setShowEditModal(false);
    setFile(null);
    setPreviewUrl(null);
    fetchTemplates();
  };

  return (user?.isAdmin ? (
    <div className="mt-10 px-4">
      <Card className="p-6">
        <div className="flex justify-between items-center border-b pb-3 mb-6">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">ID Card Templates</h2>
            <p className="text-muted-foreground text-sm mt-1">Manage all ID card templates in your system.</p>
          </div>
          <Button onClick={handleAdd} className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Template
          </Button>
        </div>
        {templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-gray-500 mb-4">No templates found.</p>
            <Button onClick={handleAdd} className="flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Template
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Admission Year</TableHead>
                <TableHead>Disabled</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell>{template.id}</TableCell>
                  <TableCell>{template.admissionYear}</TableCell>
                  <TableCell>{template.disabled ? 'Yes' : 'No'}</TableCell>
                  <TableCell>
                    <Button size="icon" variant="outline" onClick={() => handleEdit(template)}><Edit className="w-4 h-4" /></Button>
                    <Button size="icon" variant="destructive" onClick={() => handleDelete(template.id)}><Trash className="w-4 h-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
      <TemplateModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        mode="add"
        form={form}
        file={file}
        previewUrl={previewUrl}
        academicYears={academicYears}
        handleFormChange={handleFormChange}
        handleFileChange={handleFileChange}
        handleSubmit={handleAddSubmit}
      />
      <TemplateModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        mode="edit"
        form={form}
        file={file}
        previewUrl={previewUrl}
        academicYears={academicYears}
        handleFormChange={handleFormChange}
        handleFileChange={handleFileChange}
        handleSubmit={handleEditSubmit}
        disableAdmissionYear
        initialPreviewUrl={editTemplate ? `/templates/${editTemplate.id}.jpeg` : null}
      />
    </div>
  ) : (
    <div>
      <h1>You are not authorized to access this page</h1>
    </div>
  ));
}
