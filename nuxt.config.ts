import { defineNuxtConfig } from 'nuxt/config';

export default defineNuxtConfig(async () => {
    let prerenderRoutes = ['/'];

    if (
        process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
        process.env.GOOGLE_SERVICE_ACCOUNT_KEY &&
        process.env.GOOGLE_DRIVE_ROOT_ID
    ) {
        const { collectDriveRoutes } = await import('./lib/driveTree');
        prerenderRoutes = await collectDriveRoutes();
    }

    return {
        devtools: { enabled: true },
        css: ['~/assets/css/main.css'],
        app: {
            head: {
                title: 'Tattoo Portfolio Generator',
                htmlAttrs: { lang: 'en' },
                meta: [
                    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
                    {
                        name: 'description',
                        content: 'Static tattoo portfolio generated from a Google Drive folder tree.',
                    },
                ],
                link: [
                    {
                        rel: 'preconnect',
                        href: 'https://fonts.googleapis.com',
                    },
                    {
                        rel: 'preconnect',
                        href: 'https://fonts.gstatic.com',
                        crossorigin: '',
                    },
                    {
                        rel: 'stylesheet',
                        href: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600&display=swap',
                    },
                ],
            },
        },
        nitro: {
            prerender: {
                routes: prerenderRoutes,
            },
        },
        runtimeConfig: {
            googleServiceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            googleServiceAccountKey: process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
            googleDriveRootId: process.env.GOOGLE_DRIVE_ROOT_ID,
        },
    };
});

