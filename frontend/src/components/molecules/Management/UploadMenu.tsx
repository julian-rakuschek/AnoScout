import { Popover } from "@headlessui/react";
import { ArrowUpTrayIcon } from "@heroicons/react/24/outline";
import Upload from "./Upload";
import { Bucket } from "../../../types";

export default function UploadMenu({ bucket } : {bucket : Bucket}): JSX.Element {
  return (
    <div className="flex flex-col z-50">
      <Popover>
        <Popover.Button className="rounded-md bg-indigo-600 px-2.5 py-1.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">Upload</Popover.Button>
        <div className="relative">
          <Popover.Panel className="absolute z-50 w-[500px] shadow-2xl rounded-2xl mt-2">
            <Upload bucket={bucket} />
          </Popover.Panel>
        </div>
      </Popover>
    </div>
  );
}