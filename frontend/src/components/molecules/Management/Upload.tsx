import React, { useState } from "react";
import { FilePond } from "react-filepond";
import "filepond/dist/filepond.min.css";
import { useQueryClient } from "@tanstack/react-query";
import { setOptions } from "filepond";
import { Bucket } from "../../../types";

export default function Upload({ bucket } : {bucket : Bucket}): JSX.Element {
  const [files, setFiles] = useState([] as any[]);
  const queryClient = useQueryClient();

  setOptions({
    server: {
      url: "/api/db/ts/import",
      process: {
        url: "",
        method: "POST",
        ondata: formData => {
          formData.append("bucket", bucket._id.$oid);
          return formData;
        },
      },
    },
  });

  return (
    <div className="bg-white flex flex-col p-4 rounded-lg mt-1 gap-y-4">
      <div className="flex flex-col w-full gap-y-3">
        <span className="text-indigo-500 font-bold">How to Upload</span>
        <span className="font-light">
          TimeSeries data can be uploaded via the dropzone.
          <span className="font-bold"> Only CSV files are accepted. </span>
          The column "timestamp" will be treated as the timestamp column, date format is expected to be in ISO-format.
          If no "timestamp" column can be found, a pseudo timestamp column will be created automatically.
        </span>
      </div>
      <div className="flex flex-col grow gap-y-5">
        <FilePond
          files={files}
          onupdatefiles={setFiles}
          onprocessfiles={() => queryClient.invalidateQueries()}
          allowMultiple={true}
          name="file"
          labelIdle={`Drag & Drop your files or <span class="filepond--label-action">Browse</span>`}
          credits={false}
        />
      </div>

    </div>
  );
}