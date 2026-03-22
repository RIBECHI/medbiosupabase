import type { SVGProps } from "react";

export function AesthetiqLogo(props: SVGProps<SVGSVGElement>) {
    return (
        <svg 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            {...props}
        >
            <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20Z" fill="currentColor"/>
            <path d="M12 6C9.24 6 7 8.24 7 11C7 12.76 7.85 14.33 9.21 15.24L10.62 13.83C9.88 13.25 9.33 12.2 9.33 11C9.33 9.53 10.53 8.33 12 8.33C13.47 8.33 14.67 9.53 14.67 11C14.67 12.2 14.12 13.25 13.38 13.83L14.79 15.24C16.15 14.33 17 12.76 17 11C17 8.24 14.76 6 12 6Z" fill="currentColor"/>
        </svg>
    )
}
