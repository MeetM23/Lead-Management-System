export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                heading: ['Oswald', 'sans-serif'],
            },
            colors: {
                // Zentry inspired colors
                primary: '#5724FF', // Violet
                secondary: '#EDFF66', // Yellow
                dark: '#010101',
                light: '#DFDFF0',
            }
        },
    },
    plugins: [],
}

