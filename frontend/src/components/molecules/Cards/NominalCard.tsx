import { Nominal, ToastType } from "../../../types";
import { Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAtom } from "jotai/index";
import { hoveringAnomalyAtom, selectedAnomalyAtom, selectedNominalAtom } from "lib/atoms";
import { useTimeSeries } from "lib/hooks";
import { ApiRoutes } from "lib/api/ApiRoutes";
import { useQueryClient } from "@tanstack/react-query";
import { toastAtom } from "lib/atoms";

export default function NominalCard({ nominal }: { nominal: Nominal }): JSX.Element {
  const [hovering, setHovering] = useAtom(hoveringAnomalyAtom);
  const ts = useTimeSeries(nominal.TID.$oid);
  const queryClient = useQueryClient();
  const [toast, setToast] = useAtom(toastAtom);
  const [selectedAnomaly, setSelectedAnomaly] = useAtom(selectedAnomalyAtom);
  const [selectedNominal, setSelectedNominal] = useAtom(selectedNominalAtom);
  const selected = selectedNominal === nominal._id.$oid;

  const handleDelete = async (): Promise<void> => {
    if(selected) setSelectedNominal("");
    const res = await ApiRoutes.deleteNominal.fetch({ params: { NID: nominal._id.$oid } });
    if(res.success) setToast({ message: "Nominal deleted!", type: ToastType.Success });
    else setToast({ message: "Could not delete nominal!", type: ToastType.Error });
    await queryClient.invalidateQueries();
  };

  const setSelected = (): void => {
    if(selected) setSelectedNominal("");
    else setSelectedNominal(nominal._id.$oid);
    setSelectedAnomaly("");
  };

  return (
    <div className="w-full h-full relative">
      <div
        className={`w-full h-full p-5 shadow-lg transition flex flex-col border-2 border-transparent hover:border-2 hover:border-teal-500 rounded-lg ${selected ? "bg-teal-500 text-white" : "bg-white text-gray-700"}`}
        onClick={() => setSelected()} onMouseOver={() => setHovering(nominal._id.$oid)} onMouseOut={() => setHovering("")}>
        <ResponsiveContainer width="100%" height={100}>
          <LineChart data={nominal.ts_data}>
            <XAxis dataKey="timestamp_string" angle={-45} tick={false} stroke={selected ? "white" : "black"}/>
            <YAxis domain={["auto", "auto"]} type="number" allowDataOverflow yAxisId="1" stroke={selected ? "white" : "black"}/>
            <Line type="monotone" dataKey={`values.${nominal.channel}`} stroke={selected ? "white" : "black"} dot={false} isAnimationActive={false} yAxisId="1"/>,
          </LineChart>
        </ResponsiveContainer>
        <div className="w-full mb-7">
          {ts && <p><span className="font-semibold">Timeseries: </span>{ts.name}</p>}
          <p><span className="font-semibold">Channel: </span>{nominal.channel}</p>
          <p className="inline"><span className="font-semibold">Start: </span>{nominal.start.$date}</p>
          <p><span className="font-semibold">End: </span>{nominal.end.$date}</p>
        </div>
      </div>
      <div className="w-full flex flex-row justify-center items-center mt-3 absolute bottom-3">
        <div className="border-solid border-[1px] border-red-500 rounded-full px-3 text-red-500 cursor-default bg-white transition hover:bg-red-500 hover:text-white" onClick={() => handleDelete()}>Delete</div>
      </div>
    </div>

  );
}