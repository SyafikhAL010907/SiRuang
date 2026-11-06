'use client';

import React, { useState, useEffect } from 'react';
import MobileLayout from './Mobile/MobileLayout';
import WebTabLayout from './Web&Tab/WebTabLayout';

const MainUser = () => {
    const [isMobile, setIsMobile] = useState(false);
    const [userName, setUserName] = useState('User');

    useEffect(() => {
        // Ambil nama dari localStorage
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            const parsed = JSON.parse(storedUser);
            // Cek semua kemungkinan nama variabel (username atau Username)
            const name = parsed.username || parsed.Username || 'User';
            setUserName(name);
        }

        const checkScreen = () => {
            setIsMobile(window.innerWidth < 1024);
        };
        
        checkScreen();
        window.addEventListener('resize', checkScreen);
        return () => window.removeEventListener('resize', checkScreen);
    }, []);

    if (isMobile) {
        return <MobileLayout />;
    }

    return <WebTabLayout />;
};

export default MainUser;
