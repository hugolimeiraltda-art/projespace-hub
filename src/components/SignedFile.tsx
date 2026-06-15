import { useEffect, useState, type AnchorHTMLAttributes, type ImgHTMLAttributes, type MouseEvent, type ReactNode } from "react";
import { getSignedFileUrl } from "@/lib/storageSignedUrl";

type SignedImageProps = {
  bucket: string;
  value: string;
} & Omit<ImgHTMLAttributes<HTMLImageElement>, "src">;

export function SignedImage({ bucket, value, alt = "", ...rest }: SignedImageProps) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    let mounted = true;
    if (!value) {
      setUrl("");
      return;
    }
    getSignedFileUrl(bucket, value).then((u) => {
      if (mounted) setUrl(u);
    });
    return () => {
      mounted = false;
    };
  }, [bucket, value]);
  return <img src={url} alt={alt} {...rest} />;
}

type SignedLinkProps = {
  bucket: string;
  value: string;
  children: ReactNode;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "onClick">;

export function SignedLink({ bucket, value, children, ...rest }: SignedLinkProps) {
  const handleClick = async (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (!value) return;
    const url = await getSignedFileUrl(bucket, value);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };
  return (
    <a href="#" onClick={handleClick} {...rest}>
      {children}
    </a>
  );
}
