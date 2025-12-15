// src/components/Footer.tsx
export default function Footer() {
    return (
        <footer style={{
            textAlign: 'center',
            padding: '24px',
            marginTop: '24px',
        }}>
            <p style={{
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '18px',
                margin: 0,
            }}>
                Built with ❤️ by{' '}
                <a
                    href="https://humanizetech.ai/"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        color: '#ffffff',
                        textDecoration: 'none',
                        fontWeight: 600,
                        transition: 'opacity 0.2s',
                    }}
                    onMouseOver={(e) => e.currentTarget.style.opacity = '0.7'}
                    onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
                >
                    humanize
                </a>
            </p>
        </footer>
    );
}