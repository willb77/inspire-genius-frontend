"use client";
import ReactPaginate from "react-paginate";

export type PaginationProps = {
  pageCount: number; // total pages
  page: number; // 1-based current page
  onPageChange: (page: number) => void; // receives 1-based page
  marginPagesDisplayed?: number;
  pageRangeDisplayed?: number;
  className?: string;
};

export default function Pagination({
  pageCount,
  page,
  onPageChange,
  marginPagesDisplayed = 1,
  pageRangeDisplayed = 3,
  className,
}: PaginationProps) {
  return (
    <ReactPaginate
      breakLabel="…"
      nextLabel=">"
      previousLabel="<"
      onPageChange={(sel) => onPageChange(sel.selected + 1)}
      forcePage={Math.max(0, Math.min(pageCount - 1, page - 1))}
      pageCount={pageCount}
      marginPagesDisplayed={marginPagesDisplayed}
      pageRangeDisplayed={pageRangeDisplayed}
      containerClassName={"flex items-center gap-1 " + (className ?? "")}
      pageClassName=""
      pageLinkClassName="px-2 py-1 rounded hover:bg-gray-100 cursor-pointer"
      previousClassName=""
      previousLinkClassName="px-2 py-1 rounded hover:bg-gray-100 cursor-pointer"
      nextClassName=""
      nextLinkClassName="px-2 py-1 rounded hover:bg-gray-100 cursor-pointer"
      breakClassName=""
      breakLinkClassName="px-2 py-1"
      disabledClassName="opacity-50 pointer-events-none"
      activeLinkClassName="bg-blue-600 text-white hover:bg-blue-600 cursor-pointer"
      renderOnZeroPageCount={null}
    />
  );
}
