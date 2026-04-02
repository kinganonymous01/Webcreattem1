interface LoadingScreenProps {
  status: string;
}

export default function LoadingScreen({ status }: LoadingScreenProps) {
  return (
    <div className="loading-screen">
      <div className="loading-spinner" />
      <p className="loading-status">
        {status || 'Loading...'}
      </p>
    </div>
  );
}
