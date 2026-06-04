"use client";

import { formatSubscribers } from "@/utils/roundFigures";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { MdContentPasteGo } from "react-icons/md";
import { TbCancel } from "react-icons/tb";
import { InfinitySpin } from "react-loader-spinner";

export interface FetchedForm {
  thumbnailurl: string;
  title: string;
  channel: string;
  channel_tag: string;
  channel_url: string;
  subscribers: number;
  duration_string: string;
  acodecFormats: any[];
  vcodecFormats: any[];
  formatsString: string[];
}

const page = () => {
  const [url, seturl] = useState<string | null>("");
  const [error, seterror] = useState<string | null>("");
  const [loading, setloading] = useState<boolean>(false);
  const [fetchedForm, setfetchedForm] = useState<FetchedForm | null>(null);
  const [downloadFormatID, setdownloadFormatID] = useState<Number | null>(null);

  const urlRef = useRef<HTMLInputElement>(null);

  const handlePaste = async (): Promise<void> => {
    const text = await navigator.clipboard.readText();
    seturl(text);
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedFormatStr = e.target.value;

    const selectedFormat = fetchedForm?.vcodecFormats.find(
      (format) => format.format_note === selectedFormatStr,
    );

    if (!selectedFormat) {
      alert("Selected format not found in the available formats");
      return;
    }

    if (selectedFormat.includes("mp3")) {
      const audioFormat = fetchedForm?.acodecFormats.find(
        (format) => format.format_note === "medium",
      ).format_id;
      setdownloadFormatID(audioFormat); // Assuming 140 is the format ID for mp3 audio
      return;
    }

    setdownloadFormatID(selectedFormat.format_id);
  };

  const handleFetch = async (): Promise<void> => {
    // Checks and validations for Url
    if (!url) {
      seterror("Please enter a YouTube URL");
      return;
    }

    if (!url.includes("https://")) {
      seterror("Please enter a valid YouTube URL");
      return;
    }

    if (url == String(urlRef.current?.value) && fetchedForm) {
      seterror("Data is already shown for this URL");
      return;
    }

    if (loading) {
      seterror("wait previous request still in progress !");
      return;
    }

    setloading(true);

    const res = await fetch("/api/fetchdata", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      seterror(errorData.error || "An error occurred while fetching data");
      alert(
        errorData.error || "An error occurred while fetching data from Link",
      );
      setloading(false);
      return;
    }

    const data = await res.json();

    const acodecFormats = data.info.formats
      .filter((format: any) => {
        return (
          format.acodec.startsWith("mp4a") && format.format_note == "medium"
        );
      })
      .map((format: any) => {
        return {
          acodec: format.acodec,
          filesize: format.filesize,
          format_id: format.format_id,
          format_note: format.format_note,
          audio_url: format.url,
        };
      });

    const vcodecFormats = data.info.formats
      .filter((format: any) => format.vcodec.startsWith("avc1"))
      .map((format: any) => {
        return {
          filesize: format.filesize,
          format_id: format.format_id,
          format_note: format.format_note,
          vcodec: format.vcodec,
          video_url: format.url,
        };
      });

    const selectFormatStr: string[] = vcodecFormats.map(
      (format: any) => format.format_note,
    );

    const duplicateRemovedFormats: string[] = [...new Set(selectFormatStr)];

    const fetchfilterSetData: FetchedForm = {
      thumbnailurl: data.info.thumbnail,
      title: data.info.title,
      channel: data.info.channel,
      channel_tag: data.info.uploader_id,
      channel_url: data.info.uploader_url,
      subscribers: data.info.channel_follower_count,
      duration_string: data.info.duration_string,
      acodecFormats: acodecFormats,
      vcodecFormats: vcodecFormats,
      formatsString: [...duplicateRemovedFormats, "mp3 [Only Audio]"],
    };

    setfetchedForm(fetchfilterSetData);
    // console.log("acodecformats",acodecFormats);
    // console.log("vcodecformats",vcodecFormats);
    seterror("");
    setloading(false);
  };

  const handleDownload = async () => {
    if (loading) {
      return;
    }
    setloading(true);
    if (!fetchedForm) {
      seterror("No video information available for download");
      return;
    }

    if (!downloadFormatID) {
      seterror("Please select a format to download");
      return;
    }

    if (downloadFormatID === 140) {
      const safeAudioUrl = encodeURIComponent(
        fetchedForm?.acodecFormats.find(
          (format) => format.format_note === "medium",
        )?.audio_url ?? "",
      );

      window.location.href = `/api/download?audioUrl=${safeAudioUrl}&title=${encodeURIComponent(fetchedForm.title)}`;
      return;
    }

    if (downloadFormatID === 18 || downloadFormatID === 134) {
      const safeVideoURL = encodeURIComponent(
        fetchedForm?.vcodecFormats.find((format) => format.format_id === 18)
          ?.url ?? "",
      );
      window.location.href = `/api/download?videoUrl=${safeVideoURL}&title=${encodeURIComponent(fetchedForm.title)}`;
      return;
    }

    // Implement the download logic here, using the selected format ID
    // You can make an API call to your backend to handle the download process

    const encodedVideoUrl = encodeURIComponent(
      fetchedForm?.vcodecFormats.find(
        (format) => format.format_id === downloadFormatID,
      )?.video_url ?? "",
    );

    const fetchedAudioUrl = fetchedForm?.acodecFormats.find(
      (format) => format.format_note === "medium",
    )?.audio_url;
    const encodedAudioUrl = encodeURIComponent(fetchedAudioUrl);

    const encodedTitle = encodeURIComponent(fetchedForm?.title ?? "");

    if (!encodedAudioUrl) {
      seterror("not audio URL");
      setloading(false);
      return;
    }

    window.location.href = `/api/downloadffmpeg?videourl=${encodedVideoUrl}&audiourl=${encodedAudioUrl}&title=${encodedTitle}`;

    // Handle the response for the download initiation if needed
    alert("Download initiated successfully!");
    setloading(false);
  };

  return (
    <div className="flex flex-col items-center w-full ">
      <h1 className="font-bold text-3xl text-center text-white mt-20">
        Enter Link then you can go ...
      </h1>
      <div className="flex gap-5 w-full justify-center mt-5 p-3">
        <button
          onClick={() => {
            handlePaste();
          }}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold border border-blue-700 rounded cursor-pointer flex items-center justify-center px-2"
        >
          <MdContentPasteGo size={25} fill="white" />
        </button>
        <div className="w-1/2 flex relative">
          <input
            ref={urlRef}
            type="text"
            name="url"
            id="url-input"
            onChange={(e) => {
              seturl(e.target.value);
            }}
            placeholder="Enter link then press go"
            className="bg-white text-black placeholder:text-black border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full px-4 py-2 rounded relative transition duration-150"
            value={String(url)}
            autoComplete="tel-extension"
          />
          <button
            onClick={() => {
              seturl("");
            }}
            className="bg-[#ff0000f8] hover:bg-[#ce0404] text-white font-bold px-4 py-1 rounded cursor-pointer absolute right-2 bottom-1.5 flex items-center justify-center gap-1 active:bg-[#ff0000f8] transition duration-150"
          >
            <TbCancel />
            Clear
          </button>
        </div>
        <button
          onClick={() => {
            handleFetch();
          }}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold px-4 border border-blue-700 rounded cursor-pointer transition duration-150"
        >
          Go
        </button>
      </div>

      <div className="text-red-500 text-xl w-full h-5 text-center flex items-center justify-center ">
        {error}{" "}
      </div>

      {loading && <InfinitySpin width="200" height="200" color="#2b7fff" />}
      {fetchedForm && (
        <div className="w-full h-full flex flex-col md:flex-row gap-7 items-center justify-center">
          <div className="">
            <div className="w-5/6 md:w-160 md:h-90 h-52 mx-auto relative">
              <Image
                src={fetchedForm?.thumbnailurl ?? "/logo.png"}
                alt="Thumbnail not found"
                fill
                className="object-contain"
              />
              <div className="w-fit px-2 py-0.5 bg-[#6363639a] text-white text-lg absolute bottom-2 right-2 rounded-sm">
                {fetchedForm?.duration_string ?? `11:11`}
              </div>
            </div>
            <h2 className="text-white text-xl font-bold text-start mt-2">
              {fetchedForm?.title ?? "Title of the video"}
            </h2>
            <Link
              href={fetchedForm?.channel_url ?? "#"}
              className="text-white flex items-center w-fit ml-0 "
            >
              <Image
                src={"/youtube.svg"}
                alt="Channel thumbnail not found"
                width={40}
                height={40}
                className="mr-3 "
              />
              <div className="Flex flex-col  gap-1">
                <div className="text-lg">
                  {fetchedForm?.channel ?? "channel name"}
                </div>
                <div>{fetchedForm?.channel_tag ?? "@xyz"}</div>
              </div>
              <span className="w-fit pl-5">
                <span>{formatSubscribers(fetchedForm?.subscribers) ?? 0} </span>
                {/* <span>00 </span> */}
                Subscribers
              </span>
            </Link>
          </div>

          <form
            action={handleDownload}
            className="flex flex-col items-center gap-5 mt-5"
          >
            <div className="flex gap-5 items-center">
              <h2 className="text-white font-bold text-xl">Choose Quality :</h2>
              <select
                className="bg-[#2b80ff5b] text-white px-4 py-2 rounded-sm border-2 border-[#fff0] focus:ring-2 focus:ring-blue-700  cursor-pointer"
                name="quality"
                id="select-quality"
                onChange={(e) => {
                  handleSelectChange(e);
                }}
              >
                {fetchedForm &&
                  fetchedForm.formatsString.map((formatStr, index) => (
                    <option
                      key={index}
                      value={formatStr}
                      className="bg-[#2b80ff5b] text-black px-4 py-2 rounded-sm border-2 border-[#fff0] focus:ring-2 focus:ring-blue-700 cursor-pointer"
                    >
                      {formatStr}
                    </option>
                  ))}
                {/* <option
                value={`quality 18 (360p)`}
                className="bg-[#2b80ff5b] text-black px-4 py-2 rounded-sm border-2 border-[#fff0] focus:ring-2 focus:ring-blue-700 cursor-pointer"
              >
                {`quality 18 (360p)`}
              </option> */}
              </select>
            </div>
            <div className="flex flex-col gap-3 items-center justify-center">
              <h3 className="text-red-500 text-xl text-center">{error}</h3>
              <div className="flex flex-col gap-4 items-center">
                <button
                  type="submit"
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-3 border border-blue-700 rounded cursor-pointer text-xl"
                >
                  Download
                </button>

                {/* <Link
                  href="#"
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-3 border border-blue-700 rounded cursor-pointer text-xl"
                >
                  Watch without Ads
                </Link> */}
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default page;
