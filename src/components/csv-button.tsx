"use client";

import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";

interface CsvButtonProps {
  filename: string;
  headers: string[];
  rows: (string | number)[][];
}

function escapeCell(value: string | number): string {
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function CsvButton({ filename, headers, rows }: CsvButtonProps) {
  function handleDownload() {
    const lines = [headers, ...rows].map((row: (string | number)[]) =>
      row.map(escapeCell).join(",")
    );
    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button variant="outline" size="sm" onClick={handleDownload}>
      <Download className="h-3.5 w-3.5" />
      CSV
    </Button>
  );
}
