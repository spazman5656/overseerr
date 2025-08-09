import React, { useState } from 'react';
import AirDateBadge from '@app/components/AirDateBadge';
import LoadingSpinner from '@app/components/Common/LoadingSpinner';
import type { SeasonWithEpisodes } from '@server/models/Tv';
import { defineMessages, useIntl } from 'react-intl';
import useSWR from 'swr';
import globalMessages from '@app/i18n/globalMessages';


const messages = defineMessages({
  somethingwentwrong: 'Something went wrong while retrieving season data.',
  noepisodes: 'Episode list unavailable.',
  seasonnumber: {
    id: 'seasonnumber',
    defaultMessage: 'Season {seasonNumber}',
  },
});


type SeasonProps = {
  seasonNumber: number;
  tvId: number;
};

const Season = ({ seasonNumber, tvId }: SeasonProps) => {
  const [selectedEpisodes, setSelectedEpisodes] = useState<number[]>([]);

  function handleEpisodeToggle(episodeNumber: number) {
    setSelectedEpisodes((prev) =>
      prev.includes(episodeNumber)
        ? prev.filter((num) => num !== episodeNumber)
        : [...prev, episodeNumber]
    );
  }

  function handleRequestSeason() {
    // You can later call your backend or open a modal here
    console.log("Requesting season", seasonNumber);
  }

  function handleRequestEpisodes() {
    // You can later call your backend or open a modal here
    console.log("Requesting episodes", selectedEpisodes);
  }

  const intl = useIntl();
  const { data, error } = useSWR<SeasonWithEpisodes>(
    `/api/v1/tv/${tvId}/season/${seasonNumber}`
  );

  if (!data && !error) {
    return <LoadingSpinner />;
  }

  if (!data) {
    return <div>{intl.formatMessage(messages.somethingwentwrong)}</div>;
  }

  return (
    <div className="flex flex-col justify-center divide-y divide-gray-700">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-semibold">
          {/*{seasonNumber === 0
            ? intl.formatMessage(globalMessages.specials)
            : intl.formatMessage(messages.seasonnumber, { seasonNumber })} */}
        </h2>
        {/*<button
          className="rounded bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700"
          onClick={() => handleRequestSeason()}
        >
          Request Season
        </button> */}
      </div>

      <button
        className="self-end mb-2 rounded bg-green-600 px-3 py-1 text-xs font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-600"
        onClick={handleRequestEpisodes}
        disabled={selectedEpisodes.length === 0}
      >
        Request Selected Episodes
      </button>

      {data.episodes.length === 0 ? (
        <p>{intl.formatMessage(messages.noepisodes)}</p>
      ) : (
        data.episodes
          .slice()
          .reverse()
          .map((episode) => {
            return (
              <div
                className="flex flex-col space-y-4 py-4 xl:flex-row xl:items-center xl:space-y-0 xl:space-x-4"
                key={`season-${seasonNumber}-episode-${episode.episodeNumber}`}
              >
              <input
                type="checkbox"
                checked={selectedEpisodes.includes(episode.episodeNumber)}
                onChange={() => handleEpisodeToggle(episode.episodeNumber)}
                className="mr-2"
              />
                <div className="flex-1">
                  <div className="flex flex-col space-y-2 xl:flex-row xl:items-center xl:space-y-0 xl:space-x-2">
                    <h3 className="text-lg">
                      {episode.episodeNumber} - {episode.name}
                    </h3>
                    {episode.airDate && (
                      <AirDateBadge airDate={episode.airDate} />
                    )}
                  </div>
                  {episode.overview && <p>{episode.overview}</p>}
                </div>
                {episode.stillPath && (
                  <img
                    className="h-auto w-full rounded-lg xl:h-32 xl:w-auto"
                    src={`https://image.tmdb.org/t/p/original/${episode.stillPath}`}
                    alt=""
                  />
                )}
              </div>
            );
          })
      )}
    </div>
  );
};

export default Season;
