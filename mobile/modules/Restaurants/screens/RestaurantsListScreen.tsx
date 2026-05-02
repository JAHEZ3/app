import React, { useCallback } from 'react';
import {
    View,
    FlatList,
    RefreshControl,
    StatusBar,
    StyleSheet,
    ListRenderItem,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AppText from '@/components/ui/AppText';
import { useLanguageStore } from '@/store/useLanguageStore';
import { useRestaurants } from '../hooks/useRestaurants';
import { Restaurant } from '../entities/Restaurant';
import RestaurantCard from '../components/RestaurantCard';
import RestaurantCardSkeleton from '../components/RestaurantCardSkeleton';
import ListErrorState from '../components/ListErrorState';
import ListEmptyState from '../components/ListEmptyState';
import ListFooterLoader from '../components/ListFooterLoader';

const SKELETON_COUNT = 4;
const SKELETON_KEYS = Array.from({ length: SKELETON_COUNT }, (_, i) => `sk-${i}`);

const keyExtractor = (item: Restaurant) => item.id;

const ListHeader = ({ total }: { total: number }) => {
    const { isRTL } = useLanguageStore();
    const textAlign = isRTL ? 'right' : 'left';

    return (
        <View style={styles.header}>
            <View style={[styles.headerTop, isRTL && styles.headerTopRtl]}>
                <View>
                    <AppText variant="body-sm" align={textAlign} style={styles.eyebrow}>
                        Discover
                    </AppText>
                    <AppText variant="headline-lg" align={textAlign} style={styles.title}>
                        Restaurants
                    </AppText>
                </View>
                <View style={styles.iconBubble}>
                    <Ionicons name="storefront-outline" size={20} color="#F55905" />
                </View>
            </View>
            {total > 0 && (
                <AppText variant="body-sm" align={textAlign} style={styles.subtitle}>
                    {total} place{total === 1 ? '' : 's'} ready to order from
                </AppText>
            )}
        </View>
    );
};

const SkeletonList = () => (
    <View style={styles.skeletonWrap}>
        {SKELETON_KEYS.map((k) => (
            <RestaurantCardSkeleton key={k} />
        ))}
    </View>
);

const RestaurantsListScreen = () => {
    const {
        restaurants,
        total,
        isLoading,
        isFetching,
        isRefetching,
        isError,
        error,
        refetch,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useRestaurants();

    const handleEndReached = useCallback(() => {
        if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    const handleRetry = useCallback(() => {
        refetch();
    }, [refetch]);

    const handleRestaurantPress = useCallback((restaurant: Restaurant) => {
        router.push(`/restaurants/${restaurant.id}` as never);
    }, []);

    const renderItem = useCallback<ListRenderItem<Restaurant>>(
        ({ item }) => <RestaurantCard restaurant={item} onPress={handleRestaurantPress} />,
        [handleRestaurantPress],
    );

    const showFullScreenError = isError && restaurants.length === 0;
    const showInitialLoader = isLoading && restaurants.length === 0;

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <StatusBar barStyle="dark-content" backgroundColor="#F7F7F7" />

            {showInitialLoader ? (
                <>
                    <ListHeader total={0} />
                    <SkeletonList />
                </>
            ) : showFullScreenError ? (
                <ListErrorState
                    message={error?.message ?? undefined}
                    onRetry={handleRetry}
                    loading={isFetching}
                />
            ) : (
                <FlatList
                    data={restaurants}
                    keyExtractor={keyExtractor}
                    renderItem={renderItem}
                    ListHeaderComponent={<ListHeader total={total} />}
                    ListEmptyComponent={<ListEmptyState />}
                    ListFooterComponent={
                        <ListFooterLoader visible={isFetchingNextPage} />
                    }
                    contentContainerStyle={styles.listContent}
                    onEndReached={handleEndReached}
                    onEndReachedThreshold={0.4}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefetching && !isFetchingNextPage}
                            onRefresh={refetch}
                            tintColor="#F55905"
                            colors={['#F55905']}
                        />
                    }
                    showsVerticalScrollIndicator={false}
                    removeClippedSubviews
                    initialNumToRender={6}
                    maxToRenderPerBatch={6}
                    windowSize={9}
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#F7F7F7' },
    header: {
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 16,
        gap: 6,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerTopRtl: {
        flexDirection: 'row-reverse',
    },
    eyebrow: {
        color: '#F55905',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        fontSize: 11,
        marginBottom: 2,
    },
    title: { color: '#0F172A', fontSize: 28, writingDirection: 'ltr' },
    subtitle: { color: '#6B7280', marginTop: 2 },
    iconBubble: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: '#FFF3EC',
        alignItems: 'center',
        justifyContent: 'center',
    },
    skeletonWrap: { paddingTop: 4 },
    listContent: { paddingTop: 4, paddingBottom: 24, flexGrow: 1 },
});

export default RestaurantsListScreen;
