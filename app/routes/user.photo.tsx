import type { Route } from "./+types/user.photo";
import type { Point, Area } from "react-easy-crop";
import { useCallback, useEffect, useState, useRef } from "react";
import Cropper from "react-easy-crop";
import { Form, Link, useNavigate, useFetcher, useLocation } from "react-router";
import { UserRound, Loader2, Trash2Icon } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogFooter,
	DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Slider } from "~/components/ui/slider";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "~/components/ui/tooltip";

import { requireUserId } from "~/lib/auth.server";
import { prisma } from "~/lib/prisma.server";
import { backgroundRemovalIsConfigured } from "~/lib/user.server";

export async function loader({ request }: Route.LoaderArgs) {
	const userId = await requireUserId(request);
	const userPhoto = await prisma.userPhoto.findUnique({
		where: {
			userId,
		},
	});
	return {
		userId,
		userPhoto,
		canRemoveBackground: backgroundRemovalIsConfigured,
	};
}

export default function UserUploadPictureDialog({
	loaderData,
}: Route.ComponentProps) {
	const { userPhoto, canRemoveBackground } = loaderData;
	const navigate = useNavigate();
	const location = useLocation();
	const [open, setOpen] = useState(true);
	const [originalPreviewUrl, setOriginalPreviewUrl] = useState<string | null>(
		null,
	);
	const [transparentPreviewUrl, setTransparentPreviewUrl] = useState<
		string | null
	>(null);

	const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
	const [zoom, setZoom] = useState(1);
	const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(
		null,
	);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [topEdgeTransparent, setTopEdgeTransparent] = useState(false);
	const [leftEdgeTransparent, setLeftEdgeTransparent] = useState(false);
	const [rightEdgeTransparent, setRightEdgeTransparent] = useState(false);
	const [bottomEdgeTransparent, setBottomEdgeTransparent] = useState(false);
	const fetcher = useFetcher();

	const formRef = useRef<HTMLFormElement | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleFileChange = async (
		event: React.ChangeEvent<HTMLInputElement>,
	) => {
		const file = event.target.files?.[0];
		if (file) {
			setIsLoading(true);
			setError(null);

			const originalUrl = URL.createObjectURL(file);
			setOriginalPreviewUrl(originalUrl);
			setTransparentPreviewUrl(null);

			if (canRemoveBackground) {
				try {
					const transparentImage = await removeBackground(file);
					const transparentImageUrl =
						URL.createObjectURL(transparentImage);
					setTransparentPreviewUrl(transparentImageUrl);
				} catch (err) {
					setError("Arka plan kaldırılamadı. Lütfen tekrar dene.");
					console.error("Background removal error:", err);
				} finally {
					setIsLoading(false);
				}
			} else {
				setTransparentPreviewUrl(originalUrl);
				setIsLoading(false);
			}
		}
	};

	const removeBackground = async (file: File): Promise<Blob> => {
		const formData = new FormData();
		formData.append("photo", file);

		// @todo resize image before sending it to the background removal API

		const response = await fetch("/user/photo/remove-background", {
			method: "POST",
			cache: "no-cache",
			body: formData,
			credentials: "include",
		});

		if (!response.ok) {
			throw new Error("Background removal failed");
		}

		const transparentImageBuffer = await response.arrayBuffer();
		return new Blob([transparentImageBuffer], { type: "image/png" });
	};

	const onCropComplete = useCallback(
		(croppedArea: Area, croppedAreaPixels: Area) => {
			setCroppedAreaPixels(croppedAreaPixels);
			if (canRemoveBackground) checkEdgeTransparency(croppedAreaPixels);
		},
		[croppedAreaPixels],
	);

	const checkEdgeTransparency = async (cropArea: Area) => {
		if (!transparentPreviewUrl) return;

		const image = await createImage(transparentPreviewUrl);
		const canvas = document.createElement("canvas");
		const ctx = canvas.getContext("2d", { willReadFrequently: true });

		if (!ctx) return;

		canvas.width = cropArea.width;
		canvas.height = cropArea.height;
		ctx.drawImage(
			image,
			cropArea.x,
			cropArea.y,
			cropArea.width,
			cropArea.height,
			0,
			0,
			cropArea.width,
			cropArea.height,
		);

		const leftEdgeData = ctx.getImageData(0, 0, 1, cropArea.height).data;
		const rightEdgeData = ctx.getImageData(
			cropArea.width - 1,
			0,
			1,
			cropArea.height,
		).data;
		const topEdgeData = ctx.getImageData(0, 0, cropArea.width, 1).data;
		const bottomEdgeData = ctx.getImageData(
			0,
			cropArea.height - 1,
			cropArea.width,
			1,
		).data;

		setLeftEdgeTransparent(isEdgeTransparent(leftEdgeData));
		setRightEdgeTransparent(isEdgeTransparent(rightEdgeData));
		setTopEdgeTransparent(isEdgeTransparent(topEdgeData));
		setBottomEdgeTransparent(isEdgeTransparent(bottomEdgeData));
	};

	const isEdgeTransparent = (imageData: Uint8ClampedArray): boolean => {
		for (let i = 3; i < imageData.length; i += 4) {
			if (imageData[i] !== 0) return false;
		}
		return true;
	};

	const getCroppedImg = async (
		imageSrc: string,
		pixelCrop: Area,
		maxSize: number = 1500,
	): Promise<Blob | null> => {
		const image = await createImage(imageSrc);
		const canvas = document.createElement("canvas");
		const ctx = canvas.getContext("2d");

		if (!ctx) {
			return null;
		}

		canvas.width = pixelCrop.width;
		canvas.height = pixelCrop.height;

		ctx.drawImage(
			image,
			pixelCrop.x,
			pixelCrop.y,
			pixelCrop.width,
			pixelCrop.height,
			0,
			0,
			pixelCrop.width,
			pixelCrop.height,
		);

		// Check if resizing is needed
		if (canvas.width > maxSize || canvas.height > maxSize) {
			const resizedCanvas = resizeImage(canvas, maxSize);
			return new Promise((resolve) => {
				resizedCanvas.toBlob((blob) => {
					resolve(blob);
				}, "image/png");
			});
		}

		return new Promise((resolve) => {
			canvas.toBlob((blob) => {
				resolve(blob);
			}, "image/png");
		});
	};

	const createImage = (url: string): Promise<HTMLImageElement> =>
		new Promise((resolve, reject) => {
			const image = new Image();
			image.addEventListener("load", () => resolve(image));
			image.addEventListener("error", (error) => reject(error));
			image.setAttribute("crossOrigin", "anonymous");
			image.src = url;
		});

	const resizeImage = (
		image: HTMLImageElement | HTMLCanvasElement,
		maxSize: number,
	): HTMLCanvasElement => {
		const canvas = document.createElement("canvas");
		let width =
			image instanceof HTMLCanvasElement
				? image.width
				: image.naturalWidth;
		let height =
			image instanceof HTMLCanvasElement
				? image.height
				: image.naturalHeight;

		if (width > height) {
			if (width > maxSize) {
				height *= maxSize / width;
				width = maxSize;
			}
		} else {
			if (height > maxSize) {
				width *= maxSize / height;
				height = maxSize;
			}
		}

		canvas.width = width;
		canvas.height = height;
		const ctx = canvas.getContext("2d");
		ctx?.drawImage(image, 0, 0, width, height);

		return canvas;
	};

	const handleSubmit = async (event?: React.FormEvent<HTMLFormElement>) => {
		event && event.preventDefault();
		if (transparentPreviewUrl && croppedAreaPixels) {
			try {
				const croppedImage = await getCroppedImg(
					transparentPreviewUrl,
					croppedAreaPixels,
				);
				if (croppedImage) {
					const formData = new FormData();
					formData.append("photo", croppedImage, "photo.png");

					fetcher.submit(formData, {
						method: "post",
						action: "/user/photo/upload",
						encType: "multipart/form-data",
					});
				}
			} catch (e) {
				console.error("Error cropping image:", e);
				setError("Görsel kırpılamadı. Lütfen tekrar dene.");
			}
		}
	};

	const handleReset = () => {
		setOriginalPreviewUrl(null);
		setTransparentPreviewUrl(null);
		setCrop({ x: 0, y: 0 });
		setZoom(1);
		setCroppedAreaPixels(null);
		setIsLoading(false);
		setError(null);

		if (fileInputRef.current) fileInputRef.current.value = "";
	};

	useEffect(() => {
		const down = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				e.preventDefault();
				setOpen(false);
			}
		};

		document.addEventListener("keydown", down);
		return () => document.removeEventListener("keydown", down);
	}, [navigate]);

	useEffect(() => {
		// If we have data, then the picture was uploaded and we can reset the state
		if (fetcher.data && fetcher.data.userPhoto) {
			handleReset();

			// Close the dialog
			navigate(-1);
		}
	}, [fetcher.data]);

	return (
		<Dialog
			open={open}
			onOpenChange={(open) => {
				if (!open) navigate(-1);
			}}
		>
			<TooltipProvider delayDuration={0}>
				<DialogContent className="sm:max-w-[425px]">
					<DialogHeader>
						<DialogTitle>Fotoğraf yükle</DialogTitle>
						<DialogDescription>
							Sertifikalarını paylaşırken kullanılacak bir fotoğraf
							seç. Arka planı senin için kaldıracağız. Lütfen tüm
							kenarları yeşil tutarken olabildiğince çok yer
							kapatacak şekilde fotoğrafı hareket ettir ve yakınlaştır.
							Belirgin kesintilerden kaçınmaya çalış.
						</DialogDescription>
					</DialogHeader>
					<fetcher.Form
						onSubmit={handleSubmit}
						encType="multipart/form-data"
						ref={formRef}
					>
						<div className="grid gap-4 py-4">
							<Input
								id="avatar"
								type="file"
								accept="image/*"
								onChange={handleFileChange}
								disabled={isLoading || fetcher.state !== "idle"}
								ref={fileInputRef}
							/>
							<div className="mt-4 aspect-square relative bg-gradient-to-t from-[#8B0490] to-[#1B1575] rounded-lg">
								{originalPreviewUrl || transparentPreviewUrl ? (
									<div
										className={`relative w-full h-full rounded-lg border-8 ${
											leftEdgeTransparent ||
											!canRemoveBackground
												? "border-l-green-400"
												: "border-l-amber-400"
										} ${
											rightEdgeTransparent ||
											!canRemoveBackground
												? "border-r-green-400"
												: "border-r-amber-400"
										} ${
											topEdgeTransparent ||
											!canRemoveBackground
												? "border-t-green-400"
												: "border-t-amber-400"
										} ${
											bottomEdgeTransparent &&
											canRemoveBackground
												? "border-b-amber-400"
												: "border-b-green-400"
										}`}
									>
										<div className="absolute inset-0 transition-opacity duration-1000 ease-in-out">
											{originalPreviewUrl && (
												<Cropper
													image={originalPreviewUrl}
													crop={crop}
													zoom={zoom}
													minZoom={0.5}
													aspect={1}
													restrictPosition={false}
													onCropChange={setCrop}
													onCropComplete={
														onCropComplete
													}
													onZoomChange={setZoom}
													classes={{
														containerClassName:
															"transition-opacity duration-1000 ease-in-out",
														mediaClassName:
															"transition-opacity duration-1000 ease-in-out",
													}}
													style={{
														containerStyle: {
															opacity:
																transparentPreviewUrl
																	? 0
																	: 1,
														},
														mediaStyle: {
															opacity:
																transparentPreviewUrl
																	? 0
																	: 1,
														},
													}}
												/>
											)}
										</div>
										{transparentPreviewUrl && (
											<div
												className="absolute inset-0 transition-opacity duration-1000 ease-in-out"
												style={{
													opacity:
														transparentPreviewUrl
															? 1
															: 0,
												}}
											>
												<Cropper
													image={
														transparentPreviewUrl
													}
													crop={crop}
													zoom={zoom}
													minZoom={0.5}
													aspect={1}
													restrictPosition={false}
													onCropChange={setCrop}
													onCropComplete={
														onCropComplete
													}
													onZoomChange={setZoom}
												/>
											</div>
										)}
										{(isLoading ||
											fetcher.state !== "idle") && (
											<div className="absolute inset-0 flex items-center justify-center bg-black/40">
												<div className="text-white text-center">
													<Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
													<p>
														{isLoading
															? "Arka plan kaldırılıyor..."
															: "Yükleniyor..."}
													</p>
												</div>
											</div>
										)}
									</div>
								) : (
									<div className="w-full h-full flex items-center justify-center rounded-lg overflow-hidden">
										{userPhoto ? (
											<img
												src={`/user/photo/preview.png?t=${userPhoto.updatedAt}`}
												className=""
												alt="Bu, sertifikalarının sosyal medya önizlemesinde kullanılacak"
											/>
										) : (
											<>
												<UserRound
													className="h-80 w-80 text-white"
													strokeWidth={1}
													aria-hidden="true"
												/>
												<span className="sr-only">
													Kullanıcı avatarı için yer tutucu
												</span>
											</>
										)}
									</div>
								)}
							</div>
							{(originalPreviewUrl || transparentPreviewUrl) && (
								<div className="flex items-center gap-2">
									<Label htmlFor="zoom">Yakınlaştır</Label>
									<Slider
										id="zoom"
										min={0.5}
										max={3}
										step={0.1}
										value={[zoom]}
										onValueChange={([zoom]) =>
											setZoom(zoom)
										}
									/>
								</div>
							)}
							{error && (
								<p className="text-red-500 text-sm">{error}</p>
							)}
						</div>
					</fetcher.Form>

					<DialogFooter>
						{userPhoto && (
							<Form
								action="/user/photo/delete"
								method="POST"
								className="flex grow"
							>
								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											type="submit"
											variant="destructive"
											size="icon"
										>
											<Trash2Icon />
										</Button>
									</TooltipTrigger>
									<TooltipContent side="top">
										Fotoğrafı sil
									</TooltipContent>
								</Tooltip>
							</Form>
						)}
						<Button type="button" variant="outline" asChild>
							<Link to={location.state?.fromPath ?? "/"}>
								Geri
							</Link>
						</Button>
						<Button
							type="button"
							disabled={
								!transparentPreviewUrl ||
								isLoading ||
								fetcher.state !== "idle"
							}
							onClick={() => handleSubmit()}
						>
							Fotoğraf Yükle
						</Button>
					</DialogFooter>
				</DialogContent>
			</TooltipProvider>
		</Dialog>
	);
}
