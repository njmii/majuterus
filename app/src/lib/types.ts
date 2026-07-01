export type Customer = {
  id: number;
  name: string;
  phone: string;
  address: string;
  createdAt: string;
};

export type JobStatus = "scheduled" | "in_progress" | "done" | "cancelled";

export type Job = {
  id: number;
  customerId: number;
  jobDate: string; // YYYY-MM-DD
  jobTime: string | null; // HH:mm
  position: number;
  description: string;
  partCost: number;
  laborCost: number;
  discount: number;
  subtotal: number;
  total: number;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
  customer: Customer;
};
