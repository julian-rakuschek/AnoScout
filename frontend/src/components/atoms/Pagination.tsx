import { ArrowLongLeftIcon, ArrowLongRightIcon } from "@heroicons/react/20/solid";
import { arrayRange } from "lib/helper/util";

export default function Pagination({ currentPage, pagesCount, setPage }: { currentPage: number; pagesCount: number; setPage: (page: number) => void }): JSX.Element {
  const pages: number[] = arrayRange(Math.max(1, currentPage - 2), Math.min(pagesCount, currentPage + 2), 1);
  const current_style = "inline-flex items-center border-t-2 border-indigo-500 px-4 pt-4 text-sm font-medium text-indigo-600";
  const other_style = "inline-flex items-center border-t-2 border-transparent px-4 pt-4 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700";


  return (
    <nav className="flex items-center justify-between border-t border-gray-200 px-4 sm:px-0 cursor-default">
      <div className="-mt-px flex w-0 flex-1">
        <div
          onClick={() => setPage(1)}
          className="inline-flex items-center border-t-2 border-transparent pr-1 pt-4 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700"
        >
          <ArrowLongLeftIcon className="mr-3 h-5 w-5 text-gray-400" aria-hidden="true"/>
          First
        </div>
      </div>
      {pages[0] > 1 && <span className="inline-flex items-center border-t-2 border-transparent px-4 pt-4 text-sm font-medium text-gray-500">...</span>}
      <div className="hidden md:-mt-px md:flex">
        {pages.map(page => <div
          onClick={() => setPage(page)}
          className={page === currentPage ? current_style : other_style}
        >
          {page}
        </div>)}
      </div>
      {pages[pages.length - 1] < pagesCount && <span className="inline-flex items-center border-t-2 border-transparent px-4 pt-4 text-sm font-medium text-gray-500">...</span>}
      <div className="-mt-px flex w-0 flex-1 justify-end">
        <div
          onClick={() => setPage(pagesCount)}
          className="inline-flex items-center border-t-2 border-transparent pl-1 pt-4 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700"
        >
          Last
          <ArrowLongRightIcon className="ml-3 h-5 w-5 text-gray-400" aria-hidden="true"/>
        </div>
      </div>
    </nav>
  );
}
