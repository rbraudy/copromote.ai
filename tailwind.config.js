/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                henrys: ['Montserrat', 'sans-serif'],
            },
            colors: {
                'primary-dark': '#0F172A', // Slate 900
                'secondary-dark': '#1E293B', // Slate 800
                'accent-blue': '#3B82F6', // Blue 500
                'accent-purple': '#8B5CF6', // Violet 500
            }
        },
    },
    plugins: [],
}
