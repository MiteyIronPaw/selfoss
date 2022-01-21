import React from 'react';
import { useMemo } from 'react';
import { Prompt } from 'react-router';
import { useHistory, useLocation, useRouteMatch } from 'react-router-dom';
import Source from './Source';
import { SpinnerBig } from './Spinner';
import { LoadingState } from '../requests/LoadingState';
import * as sourceRequests from '../requests/sources';
import { getAllSources } from '../requests/sources';
import { useShouldReload } from '../helpers/hooks';
import { LocalizationContext } from '../helpers/i18n';
import { HttpError } from '../errors';

function rand() {
    // https://www.php.net/manual/en/function.mt-getrandmax.php#117620
    return Math.floor(Math.random() * 2147483647);
}

function handleAddSource({
    event = null,
    setSources,
    setSpouts,
    extraInitialData = {},
}) {
    if (event) {
        event.preventDefault();
    }

    // add new source
    sourceRequests
        .getSpouts()
        .then(({ spouts }) => {
            // Update spout data.
            setSpouts(spouts);
            // Add new empty source.
            setSources((sources) => [{ id: 'new-' + rand(), ...extraInitialData }, ...sources]);
        })
        .catch((error) => {
            selfoss.app.showError(
                selfoss.app._('error_add_source') + ' ' + error.message
            );
        });
}

// load sources
function loadSources({ abortController, setSpouts, setSources, setLoadingState }) {
    if (abortController.signal.aborted) {
        return Promise.resolve();
    }

    setLoadingState(LoadingState.LOADING);

    return getAllSources(abortController).then(({sources, spouts}) => {
        if (abortController.signal.aborted) {
            return;
        }

        setSpouts(spouts);
        setSources(sources);
        setLoadingState(LoadingState.SUCCESS);
    }).catch((error) => {
        if (error.name === 'AbortError' || abortController.signal.aborted) {
            return;
        }

        selfoss.handleAjaxError(error, false).catch(function(error) {
            if (error instanceof HttpError && error.response.status === 403) {
                selfoss.history.push('/sign/in', {
                    error: selfoss.app._('error_session_expired'),
                });
                return;
            }

            selfoss.app.showError(selfoss.app._('error_loading') + ' ' + error.message);
        });

        setLoadingState(LoadingState.FAILURE);
    });
}

export default function SourcesPage() {
    const [spouts, setSpouts] = React.useState([]);
    const [sources, setSources] = React.useState([]);

    const [loadingState, setLoadingState] = React.useState(LoadingState.INITIAL);

    const forceReload = useShouldReload();

    const history = useHistory();
    const location = useLocation();
    const isAdding = useRouteMatch('/manage/sources/add');

    React.useEffect(() => {
        const abortController = new AbortController();

        loadSources({ abortController, setSpouts, setSources, setLoadingState })
            .then(() => {
                if (isAdding) {
                    const params = new URLSearchParams(location.search);
                    handleAddSource({
                        setSources,
                        setSpouts,
                        extraInitialData: {
                            spout: 'spouts\\rss\\feed',
                            params: {
                                url: params.get('url') ?? '',
                            }
                        },
                    });

                    // Clear the value from the state so it does not bug us forever.
                    history.replace('/manage/sources');
                }
            });

        return () => {
            abortController.abort();
        };
    }, [
        forceReload,
        // location.search and history are intentionally omitted
        // to prevent reloading when the presets are cleaned from the URL.
    ]);

    const addOnClick = React.useCallback(
        (event) => handleAddSource({ event, setSources, setSpouts }),
        []
    );

    const _ = React.useContext(LocalizationContext);

    const [dirtySources, setDirtySources] = React.useState({});
    const isDirty = useMemo(
        () => Object.values(dirtySources).includes(true),
        [dirtySources]
    );

    if (loadingState === LoadingState.LOADING) {
        return (
            <SpinnerBig />
        );
    }

    if (loadingState !== LoadingState.SUCCESS) {
        return null;
    }

    return (
        <React.Fragment>
            <Prompt
                when={isDirty}
                message={_('sources_leaving_unsaved_prompt')}
            />

            <button
                className="source-add"
                onClick={addOnClick}
            >
                {_('source_add')}
            </button>
            <a className="source-export" href="opmlexport">
                {_('source_export')}
            </a>
            <a className="source-opml" href="opml">
                {_('source_opml')}
            </a>
            {sources.map((source) => (
                <Source
                    key={source.id}
                    dirty={dirtySources[source.id] ?? false}
                    {...{ source, setSources, spouts, setSpouts, setDirtySources }}
                />
            ))}
        </React.Fragment>
    );
}
