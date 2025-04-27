import { Bucket } from "../../../types";
import { PlusIcon } from "@heroicons/react/20/solid";
import { Dispatch, SetStateAction, useState } from "react";
import { BucketCreateDialog } from "components/organisms/Popups/BucketCreatePopup";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ApiRoutes } from "lib/api/ApiRoutes";
import { useHotkeys } from "react-hotkeys-hook";
import { Dialog } from "@headlessui/react";
import { TrashIcon } from "@heroicons/react/24/outline";

function DeleteConfirm({ open, setOpen, bucket } : {open: boolean; setOpen: Dispatch<SetStateAction<boolean>>; bucket: Bucket }): JSX.Element {
  const queryClient = useQueryClient();

  async function handleDelete(): Promise<void> {
    await ApiRoutes.deleteBucket.fetch({ data: { id: bucket._id.$oid } });
    await queryClient.invalidateQueries();
    setOpen(false);
  }

  useHotkeys("enter", () => handleDelete(), { enableOnFormTags: ["INPUT"], enabled: open });

  return (
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      className="relative z-50"
    >
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
        <Dialog.Panel className="mx-auto rounded bg-white p-5">
          <div className="flex flex-row justify-start items-center gap-x-3">
            <TrashIcon className="text-red-500 w-5 h-5"/>
            Are you sure you want to delete this Bucket?
          </div>
          <div className="flex flex-row justify-center gap-x-2 mt-3">
            <div className="bg-gray-200 p-2 rounded-md cursor-default hover:bg-gray-300" onClick={() => setOpen(false)}>Cancel</div>
            <div className="bg-red-600 p-2 rounded-md text-white cursor-default hover:bg-red-700" onClick={() => handleDelete()}>Confirm</div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}


export default function BucketCard({ bucket }: { bucket?: Bucket }): JSX.Element {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [hovering, setHovering] = useState(false);

  if(!bucket) return <div className="relative rounded-lg shadow transition hover:shadow-lg cursor-default  w-[400px] h-[145px]">
    <div className={`col-span-1 h-full w-full`} onClick={() => setCreateDialogOpen(true)}>
      <div className="h-full w-full rounded-lg flex justify-center place-items-center transition bg-gray-200 text-gray-700 hover:bg-indigo-700 hover:text-white">
        <PlusIcon className="h-10 w-10"/>
        <BucketCreateDialog open={createDialogOpen} setOpen={setCreateDialogOpen}/>
      </div>
    </div>
  </div>;

  return (
    <div className="relative rounded-lg shadow transition hover:shadow-lg cursor-default  w-[400px] h-[145px]" onMouseOver={() => setHovering(true)} onMouseOut={() => setHovering(false)}>
      <Link to={`/buckets/${bucket._id.$oid}`} className={`col-span-1 h-full w-full`}>
        <div className="h-full w-full rounded-lg pt-2 px-2 flex flex-col gap-2 justify-center items-center bg-indigo-700">
          <span className="text-2xl font-bold overflow-hidden text-ellipsis text-white">{bucket.name}</span>
          {bucket.type === "scoring" && <span className="bg-pink-100 text-pink-800 rounded-md px-2 py-0.5">Scoring</span>}
          {bucket.type === "classification" && <span className="bg-purple-100 text-purple-800 rounded-md px-2 py-0.5">Classification ({bucket.classification_granularity})</span>}
        </div>
      </Link>
      {hovering &&
        <div className="absolute top-[7px] right-[7px] text-white cursor-default" onClick={() => setDeleteOpen(true)}>
          <TrashIcon className="w-5 h-5"/>
        </div>
      }
      {bucket.name.toLowerCase() === "tobias" && <div className="absolute bottom-0 right-0">
        <img src="tobias.png" width={100} height={100} alt={"Tobias"}/>
      </div>}
      {bucket.name.toLowerCase() === "julian" && <div className="absolute bottom-0 right-0">
        <img src="julian.png" width={100} height={100} alt={"Julian"}/>
      </div>}
      <DeleteConfirm open={deleteOpen} setOpen={setDeleteOpen} bucket={bucket} />
    </div>
  );
}