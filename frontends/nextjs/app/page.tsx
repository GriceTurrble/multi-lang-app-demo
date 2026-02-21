import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold">Welcome to MLAD Forum</h1>
      <p className="text-gray-600 dark:text-gray-400">
        A multi-language app demo — Reddit-like posts and comments, implemented
        across multiple backend frameworks.
      </p>
      <Link
        href="/posts"
        className="w-fit rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Browse Posts
      </Link>
    </div>
  );
}
