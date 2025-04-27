import React, { ReactElement, useEffect, useState } from "react";
import { CenteredLoadingSpinner } from "components/atoms/CenteredLoadingSpinner";
import { TimeSeriesListData } from "../../../types";
import { axiosClient } from "lib/api/ApiRoute";


export const LineChartServerRender = ({ data, channel, displayAxis }: { data: TimeSeriesListData; channel: string; displayAxis: boolean }): ReactElement => {
  const [img, setImg] = useState<string[]>([]);

  const fetchImage = async (displayAxisImageFetch: boolean): Promise<string> => {
    const res = await axiosClient.request({
      url: `/db/ts/query/list/image?axis=${displayAxisImageFetch}&channel=${channel}`,
      data: data,
      method: "post",
      responseType: "arraybuffer",
      headers: {
        "Content-Type": "application/json",
        "Accept": "image/png",
      },
    });
    const imageBlob = new Blob([res.data], { type: "image/png" });
    return URL.createObjectURL(imageBlob);
  };

  const setImages = async (): Promise<void> => {
    const image1 = await fetchImage(false);
    const image2 = await fetchImage(true);
    setImg([image1, image2]);
  };

  useEffect(() => {
    setImg([]);
    void setImages();
  }, [data]);

  return (
    <div className="w-full h-full">
      {img.length === 2
        ? <img src={img[displayAxis ? 1 : 0]} alt="Loading Linechart ..." className="object-contain w-full h-full"/>
        : <CenteredLoadingSpinner/>
      };
    </div>
  );
};