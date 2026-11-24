'use client';

import React, { useState, useEffect } from 'react';
import MobileLayout from './Mobile/MobileLayout';
import WebTabLayout from './Web&Tab/WebTabLayout';
import { isBuildingAdmin } from '@/lib/roles';
import { getRoleDashboardPath } from '@/lib/roleNavigation';

const MainAdmin = () => {
    const [isMobile, setIsMobile] = useState(false);
    const [adminName, setAdminName] = useState('Admin');

    useEffect(() => {
        // Ambil nama dari localStorage
        const storedUser = localStorage.getItem('user');
        console.log("[DEBUG] User Data dari Storage:", storedUser);
        if (storedUser) {
            const parsed = JSON.parse(storedUser);
            console.log("[DEBUG] Data Full:", parsed);

            // Jika admin gedung mengakses /admin, arahkan ke route gedung masing-masing
            if (isBuildingAdmin(parsed.role)) {
                window.location.href = getRoleDashboardPath(parsed.role);
                return;
            }

            // Cek semua kemungkinan nama variabel (username atau Username)
            const name = parsed.username || parsed.Username || 'Admin';
            setAdminName(name);
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

export default MainAdmin;
