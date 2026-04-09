"use client";

import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from "@/components/ui/table";

function AppTable(props: React.ComponentProps<typeof Table>) {
  return <Table {...props} />;
}

function AppTableHeader(props: React.ComponentProps<typeof TableHeader>) {
  return <TableHeader {...props} />;
}

function AppTableBody(props: React.ComponentProps<typeof TableBody>) {
  return <TableBody {...props} />;
}

function AppTableFooter(props: React.ComponentProps<typeof TableFooter>) {
  return <TableFooter {...props} />;
}

function AppTableHead(props: React.ComponentProps<typeof TableHead>) {
  return <TableHead {...props} />;
}

function AppTableRow(props: React.ComponentProps<typeof TableRow>) {
  return <TableRow {...props} />;
}

function AppTableCell(props: React.ComponentProps<typeof TableCell>) {
  return <TableCell {...props} />;
}

function AppTableCaption(props: React.ComponentProps<typeof TableCaption>) {
  return <TableCaption {...props} />;
}

export {
  AppTable,
  AppTableHeader,
  AppTableBody,
  AppTableFooter,
  AppTableHead,
  AppTableRow,
  AppTableCell,
  AppTableCaption,
};
