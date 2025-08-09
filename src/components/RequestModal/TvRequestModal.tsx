import Alert from '@app/components/Common/Alert';
import Badge from '@app/components/Common/Badge';
import Modal from '@app/components/Common/Modal';
import type { RequestOverrides } from '@app/components/RequestModal/AdvancedRequester';
import AdvancedRequester from '@app/components/RequestModal/AdvancedRequester';
import QuotaDisplay from '@app/components/RequestModal/QuotaDisplay';
import SearchByNameModal from '@app/components/RequestModal/SearchByNameModal';
import useSettings from '@app/hooks/useSettings';
import { useUser } from '@app/hooks/useUser';
import globalMessages from '@app/i18n/globalMessages';
import { ANIME_KEYWORD_ID } from '@server/api/themoviedb/constants';
import { MediaRequestStatus, MediaStatus } from '@server/constants/media';
import type { MediaRequest } from '@server/entity/MediaRequest';
import type SeasonRequest from '@server/entity/SeasonRequest';
import type { QuotaResponse } from '@server/interfaces/api/userInterfaces';
import { Permission } from '@server/lib/permissions';
import type { TvDetails } from '@server/models/Tv';
import axios from 'axios';
import { useMemo, useState, useRef, useEffect } from 'react';
import { defineMessages, useIntl } from 'react-intl';
import { useToasts } from 'react-toast-notifications';
import useSWR, { mutate } from 'swr';

const messages = defineMessages({
  requestadmin: 'This request will be approved automatically.',
  requestSuccess: '<strong>{title}</strong> requested successfully!',
  requestseriestitle: 'Request Series',
  requestseries4ktitle: 'Request Series in 4K',
  edit: 'Edit Request',
  approve: 'Approve Request',
  cancel: 'Cancel Request',
  pendingrequest: 'Pending Request',
  pending4krequest: 'Pending 4K Request',
  requestfrom: "{username}'s request is pending approval.",
  requestepisodes:
    'Request {episodeCount} {episodeCount, plural, one {Episode} other {Episodes}}',
  requestepisodes4k:
    'Request {episodeCount} {episodeCount, plural, one {Episode} other {Episodes}} in 4K',
  alreadyrequested: 'Already Requested',
  selectepisodes: 'Select Episode(s)',
  season: 'Season',
  numberofepisodes: '# of Episodes',
  seasonnumber: 'Season {number}',
  errorediting: 'Something went wrong while editing the request.',
  requestedited: 'Request for <strong>{title}</strong> edited successfully!',
  requestApproved: 'Request for <strong>{title}</strong> approved!',
  requestcancelled: 'Request for <strong>{title}</strong> canceled.',
  autoapproval: 'Automatic Approval',
  requesterror: 'Something went wrong while submitting the request.',
  pendingapproval: 'Your request is pending approval.',
});

interface RequestModalProps extends React.HTMLAttributes<HTMLDivElement> {
  tmdbId: number;
  onCancel?: () => void;
  onComplete?: (newStatus: MediaStatus) => void;
  onUpdating?: (isUpdating: boolean) => void;
  is4k?: boolean;
  editRequest?: MediaRequest;
}

// New component to render each season and its episodes
interface SeasonProps {
  tmdbId: number;
  season: TvDetails['seasons'][0];
  is4k: boolean;
  selectedEpisodes: { seasonNumber: number; episodes: number[] }[];
  onEpisodeToggle: (seasonNumber: number, episodeNumber: number) => void;
  onSeasonToggle: (
    seasonNumber: number,
    allEpisodes: number[],
    isCurrentlySelected: boolean
  ) => void;
}

const Season = ({
  tmdbId,
  season,
  is4k,
  selectedEpisodes,
  onEpisodeToggle,
  onSeasonToggle,
}: SeasonProps) => {
  const intl = useIntl();
  const [isExpanded, setExpanded] = useState(false);
  const { data: seasonData } = useSWR<
    { episodes: { id: number; episodeNumber: number; name: string }[] }
  >(isExpanded ? `/api/v1/tv/${tmdbId}/season/${season.seasonNumber}` : null);

  const thisSeasonSelections =
    selectedEpisodes.find((s) => s.seasonNumber === season.seasonNumber)
      ?.episodes ?? [];
  const isFullySelected =
    !!seasonData && thisSeasonSelections.length === seasonData.episodes.length;

  return (
    <>
      <tr
        onClick={() => setExpanded(!isExpanded)}
        className="cursor-pointer hover:bg-gray-800"
      >
        <td className="whitespace-nowrap px-4 py-4 text-sm font-medium leading-5 text-gray-100">
          <input
            type="checkbox"
            className="form-checkbox h-5 w-5 rounded border-gray-500 bg-gray-700 text-indigo-500 transition duration-150 ease-in-out"
            checked={isFullySelected}
            onChange={(e) => {
              e.stopPropagation();
              if (seasonData) {
                onSeasonToggle(
                  season.seasonNumber,
                  seasonData.episodes.map((ep) => ep.episodeNumber),
                  isFullySelected
                );
              }
            }}
            onClick={(e) => e.stopPropagation()}
            disabled={!seasonData}
          />
        </td>
        <td className="whitespace-nowrap px-1 py-4 text-sm font-medium leading-5 text-gray-100 md:px-6">
          {season.seasonNumber === 0
            ? intl.formatMessage(globalMessages.specials)
            : intl.formatMessage(messages.seasonnumber, {
                number: season.seasonNumber,
              })}
        </td>
        <td className="whitespace-nowrap px-5 py-4 text-sm leading-5 text-gray-200 md:px-6">
          {season.episodeCount}
        </td>
        <td className="whitespace-nowrap py-4 pr-2 text-sm leading-5 text-gray-200 md:px-6">
          {/* Status Badge Logic would go here */}
        </td>
      </tr>
      {isExpanded && seasonData && (
        <tr>
          <td colSpan={4} className="bg-gray-900 bg-opacity-50 px-8 py-2">
            <ul className="space-y-1">
              {seasonData.episodes.map((episode) => (
                <li key={episode.id} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`episode-${episode.id}`}
                    className="form-checkbox h-4 w-4 rounded border-gray-500 bg-gray-700 text-indigo-500 transition duration-150 ease-in-out"
                    checked={thisSeasonSelections.includes(episode.episodeNumber)}
                    onChange={() =>
                      onEpisodeToggle(season.seasonNumber, episode.episodeNumber)
                    }
                  />
                  <label
                    htmlFor={`episode-${episode.id}`}
                    className="ml-3 text-sm text-gray-300"
                  >
                    {`Episode ${episode.episodeNumber}: ${episode.name}`}
                  </label>
                </li>
              ))}
            </ul>
          </td>
        </tr>
      )}
    </>
  );
};

const TvRequestModal = ({
  onCancel,
  onComplete,
  tmdbId,
  onUpdating,
  editRequest,
  is4k = false,
}: RequestModalProps) => {
  const settings = useSettings();
  const { addToast } = useToasts();
  const { data, error } = useSWR<TvDetails>(`/api/v1/tv/${tmdbId}`);
  const [requestOverrides, setRequestOverrides] =
    useState<RequestOverrides | null>(null);
  const [selectedEpisodes, setSelectedEpisodes] = useState<
    { seasonNumber: number; episodes: number[] }[]
  >([]);
  const intl = useIntl();
  const { user, hasPermission } = useUser();
  const [searchModal, setSearchModal] = useState<{ show: boolean }>({
    show: true,
  });
  const [tvdbId, setTvdbId] = useState<number | undefined>(undefined);
  const { data: quota } = useSWR<QuotaResponse>(
    user &&
      (!requestOverrides?.user?.id || hasPermission(Permission.MANAGE_USERS))
      ? `/api/v1/user/${requestOverrides?.user?.id ?? user.id}/quota`
      : null
  );

  const selectedEpisodesRef = useRef(selectedEpisodes);
  useEffect(() => {
    selectedEpisodesRef.current = selectedEpisodes;
  }, [selectedEpisodes]);

  const totalSelectedEpisodeCount = useMemo(
    () =>
      selectedEpisodes.reduce(
        (acc, season) => acc + season.episodes.length,
        0
      ),
    [selectedEpisodes]
  );

  const updateRequest = async (alsoApproveRequest = false) => {
    if (!editRequest) {
      return;
    }

    if (onUpdating) {
      onUpdating(true);
      mutate('/api/v1/request/count');
    }

    try {
      if (totalSelectedEpisodeCount > 0) {
        await axios.put(`/api/v1/request/${editRequest.id}`, {
          mediaType: 'tv',
          serverId: requestOverrides?.server,
          profileId: requestOverrides?.profile,
          rootFolder: requestOverrides?.folder,
          languageProfileId: requestOverrides?.language,
          userId: requestOverrides?.user?.id,
          tags: requestOverrides?.tags,
          episodes: selectedEpisodesRef.current,
        });

        if (alsoApproveRequest) {
          await axios.post(`/api/v1/request/${editRequest.id}/approve`);
        }
      } else {
        await axios.delete(`/api/v1/request/${editRequest.id}`);
      }
      mutate('/api/v1/request?filter=all&take=10&sort=modified&skip=0');
      mutate('/api/v1/request/count');

      addToast(
        <span>
          {totalSelectedEpisodeCount > 0
            ? intl.formatMessage(
                alsoApproveRequest
                  ? messages.requestApproved
                  : messages.requestedited,
                {
                  title: data?.name,
                  strong: (msg: React.ReactNode) => <strong>{msg}</strong>,
                }
              )
            : intl.formatMessage(messages.requestcancelled, {
                title: data?.name,
                strong: (msg: React.ReactNode) => <strong>{msg}</strong>,
              })}
        </span>,
        {
          appearance: 'success',
          autoDismiss: true,
        }
      );
      if (onComplete) {
        onComplete(MediaStatus.PENDING);
      }
    } catch (e) {
      addToast(<span>{intl.formatMessage(messages.errorediting)}</span>, {
        appearance: 'error',
        autoDismiss: true,
      });
    } finally {
      if (onUpdating) {
        onUpdating(false);
      }
    }
  };

  const sendRequest = async () => {
    const currentEpisodeCount = selectedEpisodesRef.current.reduce(
      (acc, season) => acc + season.episodes.length,
      0
    );

    if (currentEpisodeCount === 0) {
      return;
    }

    if (onUpdating) {
      onUpdating(true);
      mutate('/api/v1/request/count');
    }

    console.log('DEBUG: Preparing to send request...'); // <-- ADD THIS

    try {
      let overrideParams = {};
      if (requestOverrides) {
        overrideParams = {
          serverId: requestOverrides.server,
          profileId: requestOverrides.profile,
          rootFolder: requestOverrides.folder,
          languageProfileId: requestOverrides.language,
          userId: requestOverrides?.user?.id,
          tags: requestOverrides.tags,
        };
      }

      const payload = {
        mediaId: data?.id,
        tvdbId: tvdbId ?? data?.externalIds?.tvdbId,
        mediaType: 'tv',
        is4k,
        episodes: selectedEpisodesRef.current,
        ...overrideParams,
      };

      console.log('DEBUG: Payload constructed:', payload); // <-- ADD THIS

      const response = await axios.post<MediaRequest>(
        '/api/v1/request',
        payload
      );

      console.log('DEBUG: Request sent successfully.'); // <-- ADD THIS

      mutate('/api/v1/request?filter=all&take=10&sort=modified&skip=0');

      if (response.data) {
        if (onComplete) {
          onComplete(response.data.media.status);
        }
        addToast(
          <span>
            {intl.formatMessage(messages.requestSuccess, {
              title: data?.name,
              strong: (msg: React.ReactNode) => <strong>{msg}</strong>,
            })}
          </span>,
          { appearance: 'success', autoDismiss: true }
        );
      }
    } catch (e) {
      console.error('DEBUG: Caught an error:', e); // <-- ADD THIS
      addToast(intl.formatMessage(messages.requesterror), {
        appearance: 'error',
        autoDismiss: true,
      });
    } finally {
      if (onUpdating) {
        onUpdating(false);
      }
    }
  };

  const handleEpisodeToggle = (seasonNumber: number, episodeNumber: number) => {
    setSelectedEpisodes((current) => {
      const seasonIndex = current.findIndex(
        (s) => s.seasonNumber === seasonNumber
      );
      const newSelections = [...current];

      if (seasonIndex === -1) {
        newSelections.push({ seasonNumber, episodes: [episodeNumber] });
      } else {
        const episodeIndex =
          newSelections[seasonIndex].episodes.indexOf(episodeNumber);
        if (episodeIndex === -1) {
          newSelections[seasonIndex].episodes.push(episodeNumber);
        } else {
          newSelections[seasonIndex].episodes.splice(episodeIndex, 1);
          if (newSelections[seasonIndex].episodes.length === 0) {
            newSelections.splice(seasonIndex, 1);
          }
        }
      }
      return newSelections;
    });
  };

  const handleSeasonToggle = (
    seasonNumber: number,
    allEpisodes: number[],
    isCurrentlySelected: boolean
  ) => {
    setSelectedEpisodes((current) => {
      const newSelections = current.filter(
        (s) => s.seasonNumber !== seasonNumber
      );
      if (!isCurrentlySelected) {
        newSelections.push({ seasonNumber, episodes: allEpisodes });
      }
      return newSelections;
    });
  };

  const isOwner = editRequest && editRequest.requestedBy.id === user?.id;

  return data && !error && !data.externalIds.tvdbId && searchModal.show ? (
    <SearchByNameModal
      tvdbId={tvdbId}
      setTvdbId={setTvdbId}
      closeModal={() => setSearchModal({ show: false })}
      onCancel={onCancel}
      modalTitle={intl.formatMessage(
        is4k ? messages.requestseries4ktitle : messages.requestseriestitle
      )}
      modalSubTitle={data.name}
      tmdbId={tmdbId}
      backdrop={`https://image.tmdb.org/t/p/w1920_and_h800_multi_faces/${data?.backdropPath}`}
    />
  ) : (
    <Modal
      loading={!data && !error}
      backgroundClickable
      onCancel={tvdbId ? () => setSearchModal({ show: true }) : onCancel}
      onOk={() => (editRequest ? updateRequest() : sendRequest())}
      title={intl.formatMessage(
        editRequest
          ? is4k
            ? messages.pending4krequest
            : messages.pendingrequest
          : is4k
          ? messages.requestseries4ktitle
          : messages.requestseriestitle
      )}
      subTitle={data?.name}
      okText={
        editRequest
          ? totalSelectedEpisodeCount === 0
            ? intl.formatMessage(messages.cancel)
            : intl.formatMessage(messages.edit)
          : totalSelectedEpisodeCount === 0
          ? intl.formatMessage(messages.selectepisodes)
          : intl.formatMessage(
              is4k ? messages.requestepisodes4k : messages.requestepisodes,
              {
                episodeCount: totalSelectedEpisodeCount,
              }
            )
      }
      okDisabled={!editRequest && totalSelectedEpisodeCount === 0}
      okButtonType={
        editRequest && totalSelectedEpisodeCount === 0 ? 'danger' : 'primary'
      }
      cancelText={
        editRequest
          ? intl.formatMessage(globalMessages.close)
          : tvdbId
          ? intl.formatMessage(globalMessages.back)
          : intl.formatMessage(globalMessages.cancel)
      }
      backdrop={`https://image.tmdb.org/t/p/w1920_and_h800_multi_faces/${data?.backdropPath}`}
    >
      {/* Informational alerts and quota display would go here, removed for brevity */}
      <div className="flex flex-col">
        <div className="-mx-4 sm:mx-0">
          <div className="inline-block min-w-full py-2 align-middle">
            <div className="overflow-hidden border border-gray-700 shadow backdrop-blur sm:rounded-lg">
              <table className="min-w-full">
                <thead>
                  <tr>
                    <th className="w-16 bg-gray-700 bg-opacity-80 px-4 py-3">
                      {/* Header checkbox could go here if "select all" is needed */}
                    </th>
                    <th className="bg-gray-700 bg-opacity-80 px-1 py-3 text-left text-xs font-medium uppercase leading-4 tracking-wider text-gray-200 md:px-6">
                      {intl.formatMessage(messages.season)}
                    </th>
                    <th className="bg-gray-700 bg-opacity-80 px-5 py-3 text-left text-xs font-medium uppercase leading-4 tracking-wider text-gray-200 md:px-6">
                      {intl.formatMessage(messages.numberofepisodes)}
                    </th>
                    <th className="bg-gray-700 bg-opacity-80 px-2 py-3 text-left text-xs font-medium uppercase leading-4 tracking-wider text-gray-200 md:px-6">
                      {intl.formatMessage(globalMessages.status)}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {data?.seasons
                    .filter((season) => season.episodeCount !== 0)
                    .map((season) => (
                      <Season
                        key={`season-${season.id}`}
                        tmdbId={tmdbId}
                        season={season}
                        is4k={is4k}
                        selectedEpisodes={selectedEpisodes}
                        onEpisodeToggle={handleEpisodeToggle}
                        onSeasonToggle={handleSeasonToggle}
                      />
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      {(hasPermission(Permission.REQUEST_ADVANCED) ||
        hasPermission(Permission.MANAGE_REQUESTS)) && (
        <AdvancedRequester
          type="tv"
          is4k={is4k}
          isAnime={data?.keywords.some(
            (keyword) => keyword.id === ANIME_KEYWORD_ID
          )}
          onChange={(overrides) => setRequestOverrides(overrides)}
          requestUser={editRequest?.requestedBy}
          defaultOverrides={
            editRequest
              ? {
                  folder: editRequest.rootFolder,
                  profile: editRequest.profileId,
                  server: editRequest.serverId,
                  language: editRequest.languageProfileId,
                  tags: editRequest.tags,
                }
              : undefined
          }
        />
      )}
    </Modal>
  );
};

export default TvRequestModal;
