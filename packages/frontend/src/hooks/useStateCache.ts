import { useDebouncedValue, useLocalStorage } from '@mantine/hooks';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useToggle } from 'react-use';

/**
 * Static cache key prefix. The number value can be incremented
 * to invalidate previous cache entries.
 *
 * Represented as a tuple so that we can use the prefix and version
 * separately (e.g to find other cache entries by cache key):
 */
const stateCacheKeyPrefix: [string, number] = ['ld-state', 1];

interface StateCacheData<CacheDataT> {
    expireAt: number;
    value: CacheDataT;
}

/**
 * Generates a short, URL-friendly state cache hash-key, out of two
 * v4 UUID segments.
 */
export const generateStateCacheKey = () => {
    return crypto.randomUUID().split('-').slice(0, 2).join('');
};

/**
 * Runs through localStorage and removes expired state cache entries, using
 * the namespace portion of `stateCacheKeyPrefix`.
 *
 * Returns a list of keys that were removed.
 */
const cleanupExpiredStateCacheData = (): string[] => {
    const tsNow = Date.now();
    return Object.keys(localStorage).filter((keyName) => {
        if (!keyName.startsWith(stateCacheKeyPrefix[0])) {
            return false;
        }

        const item = localStorage.getItem(keyName);
        if (!item) return;
        try {
            const cacheData = JSON.parse(item) as StateCacheData<unknown>;

            if (tsNow > cacheData.expireAt) {
                localStorage.removeItem(keyName);
                return true;
            }
        } catch (_e) {
            // Do nothing
        }

        return false;
    });
};

/**
 * Wrapper around mantine's `useLocalStorage` specifically for state caching, with
 * support for lazy cache expiration.
 *
 * Note that multiple tabs using the same cache key will share cache data - this
 * is cool and useful, but may also have unintended side-effects you have to
 * account for.
 *
 * const [myStateData, setMyStateData] = useStateCache<StateDataT>(generateStateCacheKey(), {
 *   initialData: myData // StateDataT
 * });
 *
 * setMyStateData({ ...myStateData, someNewValue: 'foo' });
 */
export const useStateCache = <CacheDataT = Record<string, unknown>>(
    /**
     * Unique identifier for a state cache. Should be reasonably unique, like
     * a UUID, but can also be a partial UUID if we treat state caches as
     * particularly volatile and short-lived.
     */
    hashKey: string,
    {
        /* The initial data to be cached; goes directly into local storage */
        initialData,

        /* A value in minutes after which this state cache is eligible for deletion. */
        expireAfterMinutes = 1440, // 24 hours
    }: {
        initialData: CacheDataT;
        expireAfterMinutes?: number;
        localStorageDebounceDelay?: number;
    },
) => {
    const [isInitialData, toggleIsInitialData] = useToggle(true);

    const fullKey = useMemo(
        () => `${stateCacheKeyPrefix.join('-')}/${hashKey}`,
        [hashKey],
    );

    /**
     * Ensures data going into localStorage is properly formatted, including
     * an expiry timestamp.
     */
    const createCacheEntry = useCallback(
        (data: CacheDataT): StateCacheData<CacheDataT> => ({
            expireAt: Date.now() + expireAfterMinutes * 60000, // minutes -> ms
            value: data,
        }),
        [expireAfterMinutes],
    );

    /**
     * Annoyingly, mantine v6's version of this hook is quite lazy as far as reading
     * cached state during rendering, so for now we have to handle the first/initial read ourselves:
     */
    const initialStoredValue =
        useMemo<StateCacheData<CacheDataT> | null>(() => {
            const item = localStorage.getItem(fullKey);
            return item ? JSON.parse(item) : null;
        }, [fullKey]);

    const [localStorageCacheData, setCacheDataInLocalStorage] = useLocalStorage<
        StateCacheData<CacheDataT>
    >({
        key: fullKey,
        defaultValue: initialStoredValue ?? createCacheEntry(initialData),
    });

    const [activeCacheData, setActiveCacheData] = useState<CacheDataT>(
        localStorageCacheData?.value,
    );

    const [debouncedCacheData] = useDebouncedValue(activeCacheData, 200);

    const flushCacheData = useCallback(
        (newData: CacheDataT) => {
            setCacheDataInLocalStorage(createCacheEntry(newData));

            // Allow the caller to determine if state has been mutated beyond the default value:
            toggleIsInitialData(false);

            /**
             * Push this task into a future loop since it's not critical
             * nor tied to render state:
             */
            setTimeout(() => cleanupExpiredStateCacheData(), 0);
        },
        [setCacheDataInLocalStorage, createCacheEntry, toggleIsInitialData],
    );

    useEffect(() => {
        flushCacheData(debouncedCacheData);
    }, [debouncedCacheData, flushCacheData]);

    const setCacheData = useCallback(
        (newData: CacheDataT) => {
            setActiveCacheData(newData);
        },
        [setActiveCacheData],
    );

    /**
     * Deletes the underlying local storage entry. Using `setCacheData` with
     * the same key at this point will, as you'd expect, recreate the entry.
     */
    const clearCacheData = useCallback(() => {
        localStorage.removeItem(fullKey);
    }, [fullKey]);

    return [
        activeCacheData,
        setCacheData,

        /**
         * Contains metadata that is probably not usually useful to the caller:
         */
        {
            expireAt: localStorageCacheData.expireAt,
            clearCacheData,
            hashKey,
            isInitialData,
        },
    ] as const;
};