export default function Skeleton() {
  const groups = [4, 2]; // length ==> group count, [i] ==> groupCard count
  return (
    <div className="flex h-full w-full flex-1 flex-col px-4 py-4">
      {/* display groups container */}
      <div className="flex w-full flex-col gap-4">
        {groups.map((groupCardCount, idx) => (
          <div key={idx}>
            <div className="skeleton mt-4 mb-4 overflow-hidden rounded-xl text-xl font-bold after:block after:h-[20px] after:w-full after:content-['']"></div>

            <div className="grid w-full grid-cols-1 gap-2 space-y-2 lg:grid-cols-2">
              {Array.from({ length: groupCardCount }).map((_, index) => (
                <div
                  key={`${idx}-${index}`}
                  className="relative flex h-[120px] flex-col justify-between overflow-hidden rounded-xl bg-[var(--second-white)] px-4 py-2"
                >
                  <div className="skeleton rounded-xl after:block after:h-[15px] after:w-full after:rounded-xl after:content-['']"></div>
                  <div className="skeleton w-[50%] rounded-xl after:block after:h-[10px] after:rounded-xl after:content-['']"></div>
                  <div className="skeleton w-[50%] rounded-xl after:block after:h-[10px] after:rounded-xl after:content-['']"></div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
