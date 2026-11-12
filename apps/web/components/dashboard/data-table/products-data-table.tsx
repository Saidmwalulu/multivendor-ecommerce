"use client"
import * as React from "react";
import Link from "next/link";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
} from "@tanstack/react-table";
import { ArrowUpDown, ChevronDown, Search, Trash2, Eye, EyeOff, ImageOff, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { DataTablePagination } from "./data-table-pagination";
import { DataTableRowActions } from "./data-table-row-actions";
import { ProductEditSheet } from "./product-edit-sheet";
import { deleteProduct, getStoreProducts, updateProductStatus, type ProductStatus } from "@/lib/products";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { CategoryOption } from "@/components/dashboard/forms/product-form/add-product-form";

export interface ProductImage {
  id: string;
  url: string;
  position: number;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  status: ProductStatus;
  price: number;
  compareAtPrice: number | null;
  isOnSale: boolean;
  category: { id: string; name: string } | null;
  images: ProductImage[];
  updatedAt: string;
}

interface ProductsDataTableProps {
  data: Product[];
  storeId: string;
  storeURL: string;
  categories: CategoryOption[];
  onBulkDelete?: (products: Product[]) => void;
}

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const productsQueryKey = (storeId: string) => ["store-products", storeId] as const;

// Status is now an inline toggle rather than a dropdown item — there's no
// extraActions slot on the shared DataTableRowActions, so this lives in its
// own column instead of being crammed into the actions menu.
function StatusCell({ product, storeId }: { product: Product; storeId: string }) {
  const queryClient = useQueryClient();
  const queryKey = productsQueryKey(storeId);

  const statusMutation = useMutation({
    mutationFn: (status: ProductStatus) => updateProductStatus(storeId, product.id, status),
    onMutate: async (newStatus) => {
       // Optimistic update: flip the badge immediately, don't wait on the network.
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Product[]>(queryKey);

      queryClient.setQueryData<Product[]>(queryKey, (old) =>
        old?.map((p) => (p.id === product.id ? { ...p, status: newStatus } : p)) ?? old
      );

      return { previous };
    },
    onSuccess: (data) => {
      toast.success(data.message);
      //queryClient.invalidateQueries({ queryKey: ["store-products", storeId] });
    },
    onError: (error: any, _newStatus, context) => {
      // Roll back if the request actually failed.
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      toast.error(error.response?.data?.message || "Something went wrong");
    },
    onSettled: () => {
      // Reconcile with the server in the background either way.
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const badge =
    product.status === "ACTIVE" ? (
      <Badge variant="default" className="bg-green-500/10 text-green-600 hover:bg-green-500/10">
        Active
      </Badge>
    ) : product.status === "ARCHIVED" ? (
      <Badge variant="outline">Archived</Badge>
    ) : (
      <Badge variant="secondary">Draft</Badge>
    );

  return (
    <div className="flex items-center gap-2">
      {badge}
      <Button
        variant="ghost"
        size="sm"
        className="h-6 px-2 text-xs text-muted-foreground"
        disabled={statusMutation.isPending}
        onClick={() =>
          statusMutation.mutate(product.status === "ACTIVE" ? "ARCHIVED" : "ACTIVE")
        }
      >
        {statusMutation.isPending ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : product.status === "ACTIVE" ? (
          <EyeOff className="h-3 w-3" />
        ) : (
          <Eye className="h-3 w-3" />
        )}
      </Button>
    </div>
  );
}

function ProductActionsCell({
  product,
  storeId,
  storeURL,
  categories,
}: {
  product: Product;
  storeId: string;
  storeURL: string;
  categories: CategoryOption[];
}) {
  const queryClient = useQueryClient();
  const queryKey = productsQueryKey(storeId);

  const deleteMutation = useMutation({
    mutationFn: (p: Product) => deleteProduct(storeId, p.id),
    onMutate: async (p) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Product[]>(queryKey);
      queryClient.setQueryData<Product[]>(queryKey, (old) =>
        old?.filter((item) => item.id !== p.id) ?? old
      );
      return { previous };
    },
    onSuccess: (data) => {
      toast.success(data.message);
      //queryClient.invalidateQueries({ queryKey: ["store-products", storeId] });
    },
    onError: (error: any, _p, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      toast.error(error.response?.data?.message || "Something went wrong");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return (
    <DataTableRowActions
      row={{ original: product } as any}
      entityLabel="product"
      renderEditDialog={(p: Product, open, onOpenChange) => (
        <ProductEditSheet
          productId={p.id}
          storeId={storeId}
          storeURL={storeURL}
          categories={categories}
          open={open}
          onOpenChange={onOpenChange}
        />
      )}
      onDelete={(p) => deleteMutation.mutate(p)}
    />
  );
}

export function ProductsDataTable({
  data,
  storeId,
  storeURL,
  categories,
  onBulkDelete,
}: ProductsDataTableProps) {
  const queryClient = useQueryClient();
  const queryKey = productsQueryKey(storeId);

  // The table now reads from the cache, seeded with the server-fetched
  // `data` prop. Any mutation that invalidates this key will cause a
  // background refetch and the table re-renders with fresh data — no
  // page reload needed.
  const { data: products = data } = useQuery({
    queryKey,
    queryFn: () => getStoreProducts(storeId),
    initialData: data,
  });
  
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [bulkDeleteOpen, setBulkDeleteOpen] = React.useState(false);

  const columns = React.useMemo<ColumnDef<Product>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
            className="translate-y-[2px]"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
            className="translate-y-[2px]"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: "name",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Product
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const thumbnail = row.original.images[0]?.url;
          return (
            <div className="flex items-center gap-3">
              {thumbnail ? (
                <img
                  src={thumbnail}
                  alt={row.original.name}
                  className="h-10 w-10 rounded-lg object-cover ring-1 ring-border"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted ring-1 ring-border">
                  <ImageOff className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              <div className="flex flex-col">
                <span className="font-medium">{row.original.name}</span>
                <span className="text-xs text-muted-foreground">{row.original.sku}</span>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusCell product={row.original} storeId={storeId} />,
      },
      {
        accessorKey: "price",
        header: "Price",
        cell: ({ row }) => {
          const { price, compareAtPrice, isOnSale } = row.original;
          if (isOnSale && compareAtPrice) {
            return (
              <div className="flex items-center gap-2">
                <span className="font-medium">{currencyFormatter.format(price)}</span>
                <span className="text-xs text-muted-foreground line-through">
                  {currencyFormatter.format(compareAtPrice)}
                </span>
              </div>
            );
          }
          return <span>{currencyFormatter.format(price)}</span>;
        },
      },
      {
        id: "category",
        accessorFn: (row) => row.category?.name ?? "",
        header: "Category",
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.category?.name ?? "—"}</span>
        ),
      },
      {
        accessorKey: "updatedAt",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Updated
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">{formatDate(row.original.updatedAt)}</span>
        ),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <ProductActionsCell
              product={row.original}
              storeId={storeId}
              storeURL={storeURL}
              categories={categories}
            />
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
      },
    ],
    [storeId, storeURL, categories],
  );

  const table = useReactTable({
    data: products,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  const selectedRows = table.getFilteredSelectedRowModel().rows;

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
            onChange={(event) => table.getColumn("name")?.setFilterValue(event.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          {selectedRows.length > 0 && (
            <>
              <span className="text-sm text-muted-foreground">
                {selectedRows.length} selected
              </span>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setBulkDeleteOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                Columns <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button asChild>
            <Link href={`/dashboard/seller/stores/${storeURL}/products/new`}>Add product</Link>
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No products yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <DataTablePagination table={table} />

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selectedRows.length} product{selectedRows.length === 1 ? "" : "s"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the selected products. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                // Bulk delete: optimistically drop the selected rows from cache too.
                const deletedIds = new Set(selectedRows.map((row) => row.original.id));
                queryClient.setQueryData<Product[]>(queryKey, (old) =>
                  old?.filter((p) => !deletedIds.has(p.id)) ?? old
                );
                onBulkDelete?.(selectedRows.map((row) => row.original));
                setRowSelection({});
                setBulkDeleteOpen(false);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}