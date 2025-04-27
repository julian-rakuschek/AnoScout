import { Link } from "react-router-dom";
import { ChevronLeftIcon } from "@heroicons/react/24/solid";
import React from "react";

export default function ReturnLink({ bucketId, text, width }: { bucketId: string; text: string; width?: number }): JSX.Element {
  return <div className="flex flex-row flex-nowrap justify-start items-center" style={{ width: (width != null) ? width : "auto" }}>
    <Link
      to={`/buckets/${bucketId}`}
      className="text-indigo-700 hover:text-indigo-800 mr-2 flex flex-row flex-nowrap group">
      <ChevronLeftIcon className="w-6 h-6"/>
      <div className="w-0 h-6 overflow-hidden group-hover:w-[100px] transition-[width]">Return to List</div>
    </Link>
    <p className="font-semibold text-lg">{text}</p>
  </div>;
}