import { ReactElement, useEffect, useState } from "react";
import { ALGOVIS, AlgoVisKDE, AlgoVisOCNN, AlgoVisParams, Bucket, DefaultAppResponse, ToastType } from "../../../types";
import OCNNSettings from "components/organisms/AlgoVis/settings/OCNNSettings";
import KDESettings from "components/organisms/AlgoVis/settings/KDESettings";
import { ApiRoutes } from "lib/api/ApiRoutes";
import { useAtomValue, useSetAtom } from "jotai/index";
import { segmentHoverAtom, toastAtom } from "lib/atoms";
import { useQueryClient } from "@tanstack/react-query";
import AlgoVisOCNNWrapper from "components/organisms/AlgoVis/AlgoVisOCNNWrapper";
import HoveringSegment from "components/organisms/AlgoVis/HoveringSegment";
import { useBucketChannels } from "lib/hooks";
import Select from "react-select";
import AlgoVisKDEWrapper from "components/organisms/AlgoVis/AlgoVisKDEWrapper";


const tab_style_selected = "cursor-default rounded-md bg-indigo-100 px-3 py-2 text-sm font-medium text-indigo-700";
const tab_style_unselected = "cursor-default rounded-md px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700";


export default function AlgoVis({ bucket }: { bucket: Bucket }): ReactElement {
  const [algo, setAlgo] = useState<ALGOVIS>(ALGOVIS.OCNN);
  const [algoParams, setAlgoParams] = useState<AlgoVisParams>({});
  const [selectedChannel, setSelectedChannel] = useState<{ value: string; label: string } | undefined>(undefined);

  const setToast = useSetAtom(toastAtom);
  const queryClient = useQueryClient();
  const segment = useAtomValue(segmentHoverAtom);
  const channels = useBucketChannels(bucket._id.$oid);
  const channelOptions = channels.map(c => ({ value: c, label: c }));

  useEffect(() => {
    setSelectedChannel(channelOptions[0]);
  }, [channelOptions.length]);

  const save_algorithm = async (): Promise<void> => {
    if(algo === ALGOVIS.OCNN) {
      const ocnnParams: AlgoVisOCNN = algoParams as AlgoVisOCNN;
      const name = `${ocnnParams.j}-${ocnnParams.k}-NN`;
      const params = { "k": ocnnParams.k, "j": ocnnParams.j, "ratio_threshold": ocnnParams.ratio };
      const res = await ApiRoutes.addBucketAlgorithms.fetch(
        { params: { bucket: bucket._id.$oid }, data: { name: name, algo: "J-K-NN", params: params } },
      );
      if(res.success) {
        setToast({ message: `New algorithm ${name} created`, type: ToastType.Success });
        await queryClient.invalidateQueries();
      }
    }
    if(algo === ALGOVIS.KDE) {
      const kdeParams: AlgoVisKDE = algoParams as AlgoVisKDE;
      const name = `KDE-B${kdeParams.bandwidth}-L${kdeParams.level}`;
      const params = { "bandwidth": kdeParams.bandwidth, "level": kdeParams.level };
      const res = await ApiRoutes.addBucketAlgorithms.fetch(
        { params: { bucket: bucket._id.$oid }, data: { name: name, algo: "KDE", params: params } },
      );
      if(res.success) {
        setToast({ message: `New algorithm ${name} created`, type: ToastType.Success });
        await queryClient.invalidateQueries();
      }
    }
  };

  return <div className="h-full w-full flex flex-row p-4">
    <div className="w-1/4 h-full flex flex-col p-4 gap-4 rounded-lg shadow-xl">
      <div className="flex space-x-4 justify-center">
        <div className={algo === ALGOVIS.OCNN ? tab_style_selected : tab_style_unselected} onClick={() => setAlgo(ALGOVIS.OCNN)}>OCNN</div>
        <div className={algo === ALGOVIS.KDE ? tab_style_selected : tab_style_unselected} onClick={() => setAlgo(ALGOVIS.KDE)}>KDE</div>
      </div>
      <hr/>
      <div>
        {algo === ALGOVIS.OCNN && <OCNNSettings setAlgoSettings={setAlgoParams}/>}
        {algo === ALGOVIS.KDE && <KDESettings setAlgoSettings={setAlgoParams}/>}
      </div>
      <button className="rounded-md bg-indigo-600 px-2.5 py-1.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              onClick={() => save_algorithm()}>
        Save configuration as new algorithm
      </button>
      <hr/>
      {segment && <HoveringSegment bucket={bucket} segment={segment}/>}
    </div>
    <div className={"grow"}>
      {channelOptions.length > 0 && <Select
        options={channelOptions}
        isMulti={false}
        isSearchable={false}
        closeMenuOnSelect={true}
        defaultValue={channelOptions[0]}
        value={selectedChannel}
        onChange={o => setSelectedChannel(o!)}
      />}
      <div className="h-[700px]">
        {algo === ALGOVIS.OCNN && selectedChannel && <AlgoVisOCNNWrapper bucket={bucket} channel={selectedChannel.value} params={algoParams as AlgoVisOCNN}/>}
        {algo === ALGOVIS.KDE && selectedChannel && <AlgoVisKDEWrapper bucket={bucket} channel={selectedChannel.value} params={algoParams as AlgoVisKDE}/>}
      </div>
    </div>
  </div>;
}