import React, { ReactElement } from "react";
import { Algorithm, AlgorithmParameters, ToastType } from "../../../types";
import AlgorithmSettingsInput from "components/molecules/Management/AlgorithmSettingsInput";
import { ApiRoutes } from "lib/api/ApiRoutes";
import { useSetAtom } from "jotai/index";
import { toastAtom } from "lib/atoms";
import { useQueryClient } from "@tanstack/react-query";
import { TrashIcon } from "@heroicons/react/20/solid";

export default function AlgorithmCard({ algorithm }: { algorithm: Algorithm }): ReactElement {
  const setToast = useSetAtom(toastAtom);
  const queryClient = useQueryClient();

  const updateSettings = async (param: string, value: any): Promise<void> => {
    const param_object: AlgorithmParameters = { ...algorithm.parameters };
    param_object[param].value = value;
    const res = await ApiRoutes.updateAlgorithmParams.fetch({
      data: { params: param_object },
      params: { algoId: algorithm._id.$oid },
    });
    if(res.success) setToast({ message: "Parameter updated successfully! Remember to recompute the anomaly scores when changing parameters.", type: ToastType.Success });
    else setToast({ message: "Could not save parameter!", type: ToastType.Error });
    await queryClient.invalidateQueries();
  };

  const deleteAlgorithm = async (): Promise<void> => {
    const res = await ApiRoutes.deleteBucketAlgorithm.fetch({
      params: { algoId: algorithm._id.$oid },
    });
    if(res.success) setToast({ message: "Algorithm deleted!", type: ToastType.Success });
    else setToast({ message: "Could not delete algorithm!", type: ToastType.Error });
    await queryClient.invalidateQueries();
  };

  return <div className="rounded-xl shadow-lg p-4">
    <div className="flex flex-row w-full justify-between">
      <div>
        <p className="text-indigo-700 font-bold">{algorithm.name}</p>
        <p className="text-indigo-700 text-xs">{algorithm.algorithm}</p>
      </div>
      <div className="rounded-full shadow-md w-9 h-9 flex flex-col justify-center items-center group transition hover:bg-red-500" onClick={() => deleteAlgorithm()}>
        <TrashIcon className="w-5 h-5 text-gray-800 group-hover:text-white" />
      </div>
    </div>

    <div className="flex flex-col gap-4 mt-4">
      {Object.keys(algorithm.parameters).map(param => <React.Fragment key={`${algorithm._id.$oid}.${param}`}>
        <AlgorithmSettingsInput
          name={param.replaceAll("_", " ").replace(/\b\w/g, l => l.toUpperCase())}
          paramSettings={algorithm.parameters[param]}
          updateFunction={((value: string | number | boolean | null) => updateSettings(param, value))}
        />
      </React.Fragment>)}
    </div>
  </div>;
}