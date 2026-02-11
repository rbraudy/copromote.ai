import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export const useDiscount = (sessionId: string | null) => {
    const [price, setPrice] = useState<string | undefined>(undefined);
    const [isDiscounted, setIsDiscounted] = useState(false);
    const [basePrice2yr, setBasePrice2yr] = useState<string | undefined>(undefined);
    const [basePrice3yr, setBasePrice3yr] = useState<string | undefined>(undefined);

    useEffect(() => {
        if (!sessionId) return;

        const fetchDiscount = async () => {
            // SECURITY FIX: Use RPC function instead of direct SELECT to prevent public table access
            const { data, error } = await supabase
                .rpc('get_public_prospect', { p_id: sessionId })
                .single();

            if (error) {
                console.error('Error fetching discount:', error);
                return;
            }

            if (data) {
                // Parse cents to dollars (keep precise for display)
                const formatPrice = (cents: number | null) => {
                    if (cents === null || cents === undefined) return undefined;
                    return (cents / 100).toFixed(2); // e.g. "139.99"
                };

                setBasePrice2yr(formatPrice(data.warranty_price_2yr));
                setBasePrice3yr(formatPrice(data.warranty_price_3yr));

                if (data.offer_discount_triggered && data.discount_price) {
                    const expiry = data.discount_expiry ? new Date(data.discount_expiry) : null;
                    const now = new Date();

                    // Check if discount is still valid
                    if (!expiry || expiry > now) {
                        setIsDiscounted(true);
                        setPrice(formatPrice(data.discount_price));
                    }
                }
            }
        };

        fetchDiscount();

        // Optional: Real-time subscription to catch the discount update immediately during the call
        const channel = supabase
            .channel('schema-db-changes')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'warranty_prospects',
                    filter: `id=eq.${sessionId}`,
                },
                (payload) => {
                    const newData = payload.new;
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
