import React, { useState, useEffect, useRef, useCallback } from 'react';

const CLI_COMMANDS = [
    'Downloading file... [##############] 45%',
    'Verifying checksum... [##############] 65%',
    'Extracting archive... [##############] 85%',
    'Finalizing setup... [##############] 95%',
    'Cleanup temporary files... [##############] 100%',
    'Checking for updates... [##############] 40%',
    'Loading dependencies... [##############] 55%',
    'Configuring environment... [##############] 75%',
    'Initializing components... [##############] 90%',
    'Preparing installation... [##############] 25%'
];

const DownloadComponent = () => {
    const [progress, setProgress] = useState(() => {
        const savedProgress = localStorage.getItem('progress');
        return savedProgress ? parseFloat(savedProgress) : 0;
    });
    const [dataDownloaded, setDataDownloaded] = useState(() => {
        const savedDataDownloaded = localStorage.getItem('dataDownloaded');
        return savedDataDownloaded ? parseFloat(savedDataDownloaded) : 0;
    });
    const [transferRate, setTransferRate] = useState(0);
    const [downloading, setDownloading] = useState(false);
    const [paused, setPaused] = useState(false);
    const [showCommands, setShowCommands] = useState(false);
    const [commands, setCommands] = useState([]);
    const progressIntervalRef = useRef(null);
    const downloadControllerRef = useRef(null);
    const lastUpdateTimeRef = useRef(Date.now());
    const lastDataDownloadedRef = useRef(dataDownloaded);
    const cliIntervalRef = useRef(null);
    const canceledRef = useRef(false); // Track if download was canceled

    const downloadData = useCallback(async () => {
        if (downloadControllerRef.current) {
            downloadControllerRef.current.abort();
        }

        downloadControllerRef.current = new AbortController();
        const { signal } = downloadControllerRef.current;

        try {
            const response = await fetch('https://example.com/largefile', { signal });
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const reader = response.body.getReader();
            let receivedLength = 0;
            let chunks = [];
            let previousDataDownloaded = dataDownloaded; // Track previous data downloaded

            while (downloading && !paused) {
                const { done, value } = await reader.read();
                if (done) {
                    break;
                }
                chunks.push(value);
                receivedLength += value.length;
                setDataDownloaded(prev => {
                    const newDataDownloaded = prev + value.length / (1024 * 1024); // Convert bytes to MB
                    localStorage.setItem('dataDownloaded', newDataDownloaded.toFixed(2));
                    return newDataDownloaded;
                });

                // Update transfer rate
                const now = Date.now();
                const elapsedTime = (now - lastUpdateTimeRef.current) / 1000; // seconds
                const dataSinceLastUpdate = dataDownloaded - previousDataDownloaded;
                if (elapsedTime > 0) {
                    setTransferRate(dataSinceLastUpdate / elapsedTime); // MB/s
                }
                lastUpdateTimeRef.current = now;
                previousDataDownloaded = dataDownloaded;
            }

            // Combine chunks (if needed)
            const chunksAll = new Uint8Array(receivedLength); 
            let position = 0;
            for (let chunk of chunks) {
                chunksAll.set(chunk, position);
                position += chunk.length;
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Download error:', error);
            }
        }
    }, [downloading, paused, dataDownloaded]);

    useEffect(() => {
        if (downloading) {
            if (!progressIntervalRef.current) {
                progressIntervalRef.current = setInterval(() => {
                    setProgress(prev => {
                        const newProgress = prev < 99 ? prev + 0.1 : 99;
                        localStorage.setItem('progress', newProgress.toFixed(1));
                        return newProgress;
                    });
                }, 1000); // Very slow progress
            }

            if (!cliIntervalRef.current) {
                cliIntervalRef.current = setInterval(() => {
                    setCommands(prevCommands => {
                        const nextCommand = CLI_COMMANDS[Math.floor(Math.random() * CLI_COMMANDS.length)];
                        return [...prevCommands, nextCommand].slice(-10); // Show only the last 10 commands
                    });
                }, 1000); // Add new CLI commands every second
            }

            downloadData();
        } else {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
            clearInterval(cliIntervalRef.current);
            cliIntervalRef.current = null;
            
            // Add cancellation message if download was canceled
            if (canceledRef.current) {
                setCommands(prevCommands => [
                    ...prevCommands,
                    'Download canceled by user.'
                ]);
                canceledRef.current = false;
            }
        }
    }, [downloading, downloadData]);

    useEffect(() => {
        // This effect is no longer needed for transfer rate calculation
    }, [downloading, paused]);

    const startDownload = () => {
        // Reset commands and progress
        setCommands([]);
        setProgress(0);
        setDataDownloaded(0);
        localStorage.removeItem('progress');
        localStorage.removeItem('dataDownloaded');
        
        setDownloading(true);
        setPaused(false);
        lastUpdateTimeRef.current = Date.now(); // Reset the last update time
        lastDataDownloadedRef.current = 0; // Reset the last data downloaded
    };

    const pauseDownload = () => {
        setDownloading(false);
        setPaused(true);
        if (downloadControllerRef.current) {
            downloadControllerRef.current.abort();
        }
    };

    const cancelDownload = () => {
        setDownloading(false);
        setPaused(false);
        canceledRef.current = true; // Set the canceled flag
        if (downloadControllerRef.current) {
            downloadControllerRef.current.abort();
        }
        setProgress(0);
        setDataDownloaded(0);
        localStorage.removeItem('progress');
        localStorage.removeItem('dataDownloaded');
    };

    return (
        <div>
            <div style={{ width: '100%', backgroundColor: '#ccc', marginBottom: '10px', position: 'relative' }}>
                <div
                    style={{
                        width: `${progress}%`,
                        height: '30px',
                        backgroundColor: '#4caf50',
                        position: 'relative',
                    }}
                >
                    {progress > 0 && (
                        <span
                            style={{
                                position: 'absolute',
                                right: '5px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: 'white',
                                fontSize: '12px', // Smaller font size
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {progress.toFixed(1)}%
                        </span>
                    )}
                </div>
            </div>
            <div>
                {dataDownloaded.toFixed(2)} MB / ∞
            </div>
            <div>
                Transfer Rate: {transferRate.toFixed(2)} MB/s
            </div>
            <button onClick={startDownload} disabled={downloading && !paused}>
                {paused ? 'Resume Download' : 'Start Download'}
            </button>
            <button onClick={pauseDownload} disabled={!downloading}>Pause Download</button>
            <button onClick={cancelDownload}>Cancel Download</button>
            
            <button onClick={() => setShowCommands(!showCommands)} style={{ marginTop: '10px' }}>
                {showCommands ? 'Show Less' : 'Show More'}
            </button>

            {showCommands && (
                <div style={{ marginTop: '10px', border: '1px solid #ddd', padding: '10px', backgroundColor: '#000', color: '#0f0', fontFamily: 'monospace' }}>
                    <h3>CLI Output</h3>
                    <ul style={{ listStyleType: 'none', padding: 0 }}>
                        {commands.map((command, index) => (
                            <li key={index}>{command}</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default DownloadComponent;
