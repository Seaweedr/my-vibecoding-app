/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#1A4D3B',
                    dark: '#113629',
                    light: '#4A7A64',
                },
                accent: '#D4B483',
                bg: '#F8F7F4',
                surface: '#FFFFFF',
                text: {
                    DEFAULT: '#1F2923', // Dark Green/Black for high contrast
                    secondary: '#5C6B62', // Slightly darker for better readability
                }
            },
            fontFamily: {
                heading: ['Outfit', 'sans-serif'],
                body: ['Inter', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
