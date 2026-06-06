import Link from "next/link";

import { PagedResource } from "../types";

const LinkOrButton = ({ href, children, className }: any) => {
  return href ? (
    <Link href={href} className={className}>
      {children}
    </Link>
  ) : (
    <button className={className} disabled>
      {children}
    </button>
  );
};

// Utility function to extract page number from URL or return the number as-is
const getPageNumber = (pageValue: number | string | undefined): number | null => {
  if (!pageValue) return null;
  
  if (typeof pageValue === 'number') {
    return pageValue;
  }
  
  // Extract page number from URL
  const url = new URL(pageValue);
  const pageParam = url.searchParams.get('page');
  return pageParam ? parseInt(pageParam, 10) : null;
};

type ServerPaginationProps = {
  pagedResource: PagedResource<any>;
  searchParams?: Readonly<Record<string, string | string[] | undefined>>;
};

const ServerPagination = ({
  pagedResource,
  searchParams = {},
}: ServerPaginationProps) => {
  const nextPage = getPageNumber(pagedResource.next);
  const previousPage = getPageNumber(pagedResource.previous);

  return (
    (pagedResource.next || pagedResource.previous) && (
      <div className='w-full my-8 flex justify-end'>
        <div className='join'>
          <LinkOrButton
            href={
              previousPage
                ? { query: { ...searchParams, page: previousPage } }
                : null
            }
            className='join-item btn'
          >
            «
          </LinkOrButton>
          <div className='join-item btn hover:cursor-default'>
            Page {pagedResource.current}
          </div>
          <LinkOrButton
            href={
              nextPage
                ? { query: { ...searchParams, page: nextPage } }
                : null
            }
            className='join-item btn'
          >
            »
          </LinkOrButton>
        </div>
      </div>
    )
  );
};

export default ServerPagination;
