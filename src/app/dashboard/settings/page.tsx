"use client"
import React, { useEffect, useState } from 'react'
import { User } from '@/lib/db/schema'
import { DataTable } from '@/components/ui/data-table'
import { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Plus } from 'lucide-react'

const defaultUser: User = {
  id: 0,
  name: '',
  email: '',
  phone: '',
  profileImage: '',
  createdAt: new Date(),
  updatedAt: new Date(),
};

export default function SettingsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [form, setForm] = useState<User>(defaultUser);

  const fetchUsers = () => {
    fetch('/api/users')
      .then(res => res.json())
      .then((data) => setUsers(data as User[]));
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAdd = () => {
    setForm(defaultUser);
    setShowAddModal(true);
  };

  const handleEdit = (user: User) => {
    setEditUser(user);
    setForm(user);
    setShowEditModal(true);
  };

  const handleFormChange = (field: keyof User, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleAddSubmit = async () => {
    await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setShowAddModal(false);
    fetchUsers();
  };

  const handleEditSubmit = async () => {
    await fetch(`/api/users?id=${editUser?.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setShowEditModal(false);
    fetchUsers();
  };

  const columns: ColumnDef<User>[] = [
    { accessorKey: 'id', header: 'ID' },
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'email', header: 'Email' },
    { accessorKey: 'phone', header: 'Phone' },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <Button size="sm" variant="outline" onClick={() => handleEdit(row.original)}>Edit</Button>
      ),
    },
  ];

  return (
    <div className="mt-10 px-4">
      <Card className="p-6">
        <div className="flex justify-between items-center border-b pb-3 mb-6">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Users</h2>
            <p className="text-muted-foreground text-sm mt-1">Manage all users in your system.</p>
          </div>
          <Button onClick={handleAdd} className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add User
          </Button>
        </div>
        {users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-gray-500 mb-4">No users found.</p>
            <Button onClick={handleAdd} className="flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add User
            </Button>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={users}
            page={1}
            pageSize={users.length}
            pageCount={1}
            onPageChange={() => {}}
            onPageSizeChange={() => {}}
            search=""
            onSearchChange={() => {}}
          />
        )}
        {/* Add User Modal */}
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogContent>
            <DialogTitle>Add User</DialogTitle>
            <div className="flex flex-col gap-3 mt-2">
              <Input placeholder="Name" value={form.name} onChange={e => handleFormChange('name', e.target.value)} />
              <Input placeholder="Email" value={form.email} onChange={e => handleFormChange('email', e.target.value)} />
              <Input placeholder="Phone" value={form.phone} onChange={e => handleFormChange('phone', e.target.value)} />
              <Input placeholder="Profile Image URL" value={form.profileImage || ''} onChange={e => handleFormChange('profileImage', e.target.value)} />
              <Button onClick={handleAddSubmit} className="mt-2">Save</Button>
            </div>
          </DialogContent>
        </Dialog>
        {/* Edit User Modal */}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent>
            <DialogTitle>Edit User</DialogTitle>
            <div className="flex flex-col gap-3 mt-2">
              <Input placeholder="Name" value={form.name} onChange={e => handleFormChange('name', e.target.value)} />
              <Input placeholder="Email" value={form.email} onChange={e => handleFormChange('email', e.target.value)} />
              <Input placeholder="Phone" value={form.phone} onChange={e => handleFormChange('phone', e.target.value)} />
              <Input placeholder="Profile Image URL" value={form.profileImage || ''} onChange={e => handleFormChange('profileImage', e.target.value)} />
              <Button onClick={handleEditSubmit} className="mt-2">Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </Card>
    </div>
  );
}
