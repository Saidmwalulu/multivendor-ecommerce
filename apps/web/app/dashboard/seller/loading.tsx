export default function SellerDashboardLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mb-4 text-4xl">🛍️</div>

        <h1 className="text-2xl font-semibold">
          Loading your seller dashboard...
        </h1>

        <p className="mt-2 text-muted-foreground">
          Checking your store information. Please wait...
        </p>
      </div>
    </div>
  );
}