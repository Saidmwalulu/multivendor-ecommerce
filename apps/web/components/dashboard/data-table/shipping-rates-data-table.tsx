"use client";

import * as React from "react";
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
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpDown,
  ChevronDown,
  MoreHorizontal,
  Pencil,
  RotateCcw,
  Search,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { DataTablePagination } from "./data-table-pagination";
import {
  resetStoreShippingRate,
  type CountryShippingRate,
  type StoreShippingDetails,
} from "@/lib/store"; // adjust to where you put it
import { ShippingRateFormDialog } from "../forms/shipping-rate-form-dialog";

interface ShippingRatesDataTableProps {
  storeURL: string;
  data: CountryShippingRate[];
  // The store's default shipping details, used for countries without their own rate.
  defaults: StoreShippingDetails;
}

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function SortableHeader({
  column,
  label,
}: {
  column: { toggleSorting: (desc?: boolean) => void; getIsSorted: () => false | "asc" | "desc" };
  label: string;
}) {
  return (
    <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
      {label}
      <ArrowUpDown className="ml-2 h-4 w-4" />
    </Button>
  );
}

// Own rate = normal text. Falling back to the store default = muted + italic.
const valueClass = (usesDefault: boolean) =>
  usesDefault ? "text-muted-foreground italic" : "";

// The "..." menu on each row: edit the country's rate, or reset it to the store default.
function ShippingRateRowActions({
  country,
  storeURL,
  defaults,
  onReset,
}: {
  country: CountryShippingRate;
  storeURL: string;
  defaults: StoreShippingDetails;
  onReset: (countryId: string) => void;
}) {
  const [editOpen, setEditOpen] = React.useState(false);
  const [resetOpen, setResetOpen] = React.useState(false);

  return (
    <>
      {/* modal={false} stops the page from freezing after a dialog opened from this menu closes */}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit rate
          </DropdownMenuItem>
          {/* nothing to reset when the country already uses the store default */}
          <DropdownMenuItem disabled={!country.shippingRate} onSelect={() => setResetOpen(true)}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset to default
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ShippingRateFormDialog
        storeURL={storeURL}
        country={country}
        defaults={defaults}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset the rate for {country.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              The custom rate will be removed and {country.name} will use your store defaults
              again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => onReset(country.id)}>Reset</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function ShippingRatesDataTable({ storeURL, data, defaults }: ShippingRatesDataTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  // Checkboxes only mark the rows you're working on; there are no bulk actions.
  const [rowSelection, setRowSelection] = React.useState({});

  const queryClient = useQueryClient();

  // Removes the custom rate, so the country falls back to the store default.
  const resetMutation = useMutation({
    mutationFn: (countryId: string) => resetStoreShippingRate(storeURL, countryId),
    onSuccess: (result) => {
      toast.success(result.message ?? "Rate reset to store default");
      queryClient.invalidateQueries({ queryKey: ["store-shipping-rates", storeURL] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Something went wrong");
    },
  });

  // One column per fee: the country's own value, otherwise the store default.
  const feeColumn = (
    id: string,
    label: string,
    pickRate: (rate: NonNullable<CountryShippingRate["shippingRate"]>) => number,
    defaultValue: number,
  ): ColumnDef<CountryShippingRate> => ({
    id,
    accessorFn: (row) => (row.shippingRate ? pickRate(row.shippingRate) : defaultValue),
    header: ({ column }) => <SortableHeader column={column} label={label} />,
    cell: ({ row, getValue }) => (
      <span className={`tabular-nums ${valueClass(!row.original.shippingRate)}`}>
        {money.format(getValue<number>())}
      </span>
    ),
  });

  const columns = React.useMemo<ColumnDef<CountryShippingRate>[]>(
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
        header: ({ column }) => <SortableHeader column={column} label="Country" />,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span className="font-medium">{row.original.name}</span>
            <span className="rounded border bg-slate-50 px-1.5 py-0.5 text-xs text-muted-foreground">
              {row.original.code}
            </span>
          </div>
        ),
      },
      {
        id: "status",
        header: "Status",
        accessorFn: (row) => (row.shippingRate ? "Custom rate" : "Store default"),
        filterFn: "equalsString", // exact match, so one label can't match part of another
        cell: ({ getValue }) =>
          getValue<string>() === "Custom rate" ? (
            <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
              Custom rate
            </Badge>
          ) : (
            <Badge variant="secondary">Store default</Badge>
          ),
      },
      {
        id: "service",
        header: "Service",
        accessorFn: (row) => row.shippingRate?.shippingService ?? defaults.defaultShippingService,
        cell: ({ row, getValue }) => (
          <span className={valueClass(!row.original.shippingRate)}>{getValue<string>()}</span>
        ),
      },
      feeColumn("fixed fee", "Fixed", (r) => r.shippingFeeFixed, defaults.defaultShippingFeeFixed),
      feeColumn("per item", "Per item", (r) => r.shippingFeePerItem, defaults.defaultShippingFeePerItem),
      feeColumn(
        "additional item",
        "Additional item",
        (r) => r.shippingFeeForAdditionalItem,
        defaults.defaultShippingFeeForAdditionalItem,
      ),
      feeColumn("per kg", "Per kg", (r) => r.shippingFeePerKg, defaults.defaultShippingFeePerKg),
      {
        id: "delivery time",
        header: ({ column }) => <SortableHeader column={column} label="Delivery time" />,
        // sort by the minimum days
        accessorFn: (row) => row.shippingRate?.deliveryTimeMin ?? defaults.defaultDeliveryTimeMin,
        cell: ({ row }) => {
          const rate = row.original.shippingRate;
          const min = rate?.deliveryTimeMin ?? defaults.defaultDeliveryTimeMin;
          const max = rate?.deliveryTimeMax ?? defaults.defaultDeliveryTimeMax;
          return (
            <span className={`tabular-nums ${valueClass(!rate)}`}>
              {min}–{max} days
            </span>
          );
        },
      },
      {
        id: "return policy",
        header: "Return policy",
        accessorFn: (row) => row.shippingRate?.returnPolicy ?? defaults.returnPolicy,
        cell: ({ row, getValue }) => (
          <span
            className={`block max-w-56 truncate ${valueClass(!row.original.shippingRate)}`}
            title={getValue<string>()}
          >
            {getValue<string>()}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <ShippingRateRowActions
              country={row.original}
              storeURL={storeURL}
              defaults={defaults}
              onReset={(countryId) => resetMutation.mutate(countryId)}
            />
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [defaults, storeURL],
  );

  const table = useReactTable({
    data,
    columns,
    getRowId: (row) => row.id, // selection follows the country, even when the list is filtered
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    initialState: { pagination: { pageSize: 15 } },
    state: { sorting, columnFilters, columnVisibility, rowSelection },
  });

  const selectedCount = table.getFilteredSelectedRowModel().rows.length;
  const customCount = data.filter((row) => row.shippingRate).length;

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search countries..."
              value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
              onChange={(event) => table.getColumn("name")?.setFilterValue(event.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={(table.getColumn("status")?.getFilterValue() as string) ?? "all"}
            onValueChange={(value) =>
              table.getColumn("status")?.setFilterValue(value === "all" ? undefined : value)
            }
          >
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All countries</SelectItem>
              <SelectItem value="Custom rate">Custom rate</SelectItem>
              <SelectItem value="Store default">Store default</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="whitespace-nowrap text-sm text-muted-foreground">
            {selectedCount > 0 && `${selectedCount} selected · `}
            {customCount} of {data.length} with custom rate
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
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
        </div>
      </div>

      <div className="rounded-md border bg-white">
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
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <DataTablePagination table={table} />
    </div>
  );
}
