import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface PublicProspect {
    id: string;
    warranty_price_2yr: number | null;
    warranty_price_3yr: number | null;
    offer_discount_triggered: boolean;
    discount_price: number | null;
    discount_expiry: string | null;
}

export const useDiscount = (sessionId: string | null) => {
    const [price, setPrice] = useState<string | undefined>(undefined);
    const [isDiscounted, setIsDiscounted] = useState(false);
    const [basePrice2yr, setBasePrice2yr] = useState<string | undefined>(undefined);
    const [basePrice3yr, setBasePrice3yr] = useState<string | undefined>(undefined);

    useEffect(() => {
        if (!sessionId) return;

        const fetchDiscount = async () => {
            console.log('useDiscount: Fetching for Session ID:', sessionId);
            // Verify if ID is a valid UUID to prevent RPC crash
            if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId)) {
                console.error('useDiscount: Invalid UUID format');
                return;
            }

            const { data, error } = await supabase
                .rpc('get_public_prospect', { p_id: sessionId })
                .single<PublicProspect>();

            if (error) {
                console.error('useDiscount: RPC Error:', error);
                return;
            }

            console.log('useDiscount: Result Data:', data);

            if (data) {
                const formatPrice = (cents: number | null) => {
                    if (cents === null || cents === undefined) return undefined;
                    return (cents / 100).toFixed(2);
                };

                setBasePrice2yr(formatPrice(data.warranty_price_2yr));
                setBasePrice3yr(formatPrice(data.warranty_price_3yr));

                if (data.offer_discount_triggered && data.discount_price) {
                    const expiry = data.discount_expiry ? new Date(data.discount_expiry) : null;
                    const now = new Date();

                    if (!expiry || expiry > now) {
                        setIsDiscounted(true);
                        setPrice(formatPrice(data.discount_price));
                    }
                }
            }
        };

        fetchDiscount();

        const channel = supabase
            .channel(`discount-${sessionId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'warranty_prospects',
                    filter: `id=eq.${sessionId}`,
                },
                (payload) => {
                    const newData = payload.new as PublicProspect;
                    if (newData.offer_discount_triggered && newData.discount_price) {
                        const expiry = newData.discount_expiry ? new Date(newData.discount_expiry) : null;
                        const now = new Date();
                        if (!expiry || expiry > now) {
                            setIsDiscounted(true);
                            setPrice((newData.discount_price / 100).toFixed(2));
                        }
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [sessionId]);

    return { price, isDiscounted, basePrice2yr, basePrice3yr };
};
