import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Settings() {
    const navigate = useNavigate();

    // Redirect away as this page is obsolete in CoPromote
    React.useEffect(() => {
        navigate('/dashboard');
    }, [navigate]);

    return null;
}
