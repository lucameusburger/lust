"use client";

import * as ContextMenu from '@radix-ui/react-context-menu';

import { ApiImageData, ContextMenuTriggerState, DraggableImage } from '../types'; // Adjust path as needed

import Image from 'next/image';

// Radix UI Style Constants
const RDX_CONTENT_CLASS = "min-w-[220px] bg-gray-800 text-gray-200 p-1 shadow-xl rounded-lg border border-gray-700 focus:outline-none z-[5000]";
const RDX_ITEM_CLASS = "flex items-center px-3 py-2 text-sm rounded-md hover:bg-gray-700 hover:text-white focus:outline-none focus:bg-gray-700 select-none cursor-default data-[disabled]:opacity-50 data-[disabled]:pointer-events-none";
const RDX_SEPARATOR_CLASS = "h-px my-1 bg-gray-700";
const RDX_SUB_TRIGGER_CLASS = RDX_ITEM_CLASS + " justify-between";
const RDX_SUB_CONTENT_CLASS = RDX_CONTENT_CLASS + " ml-1 max-h-[60vh] overflow-y-auto";
const RDX_LABEL_CLASS = "px-3 py-1.5 text-xs font-semibold text-gray-400 select-none";
const RDX_INPUT_CLASS = "w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50";

interface AppContextMenuProps {
    contextMenuTriggerInfo: ContextMenuTriggerState | null;
    availableImages: ApiImageData[];
    images: DraggableImage[]; // For finding the current image
    onCloseAutoFocus?: (event: Event) => void;
    // Handlers - ensure all necessary handlers are passed or defined within if self-contained
    handleAddNewImageFromAvailable: (selectedImage: ApiImageData, x: number, y: number) => void;
    handleDeleteImage: (imageId: number) => void;
    setImages: React.Dispatch<React.SetStateAction<DraggableImage[]>>; // For size slider
    handleChangeAnimation: (imageId: number, animation: 'none' | 'bounce' | 'spin') => void;
    handleChangeRotationInContextMenu: (imageId: number, rotation: number) => void;
    handleToggleMirrorInContextMenu: (imageId: number, axis: 'X' | 'Y') => void;
    handleBringToFront: (imageId: number) => void;
    handleSendToBack: (imageId: number) => void;
    handleBringForward: (imageId: number) => void;
    handleSendBackward: (imageId: number) => void;
}

export default function AppContextMenu({
    contextMenuTriggerInfo,
    availableImages,
    images,
    onCloseAutoFocus = (e) => e.preventDefault(),
    handleAddNewImageFromAvailable,
    handleDeleteImage,
    setImages,
    handleChangeAnimation,
    handleChangeRotationInContextMenu,
    handleToggleMirrorInContextMenu,
    handleBringToFront,
    handleSendToBack,
    handleBringForward,
    handleSendBackward
}: AppContextMenuProps) {

    if (!contextMenuTriggerInfo) return null;

    const { imageId, triggerX, triggerY } = contextMenuTriggerInfo;
    const currentImage = imageId !== null ? images.find(img => img.id === imageId) : null;

    // Viewport ContextMenu (Add Image)
    if (imageId === null) {
        return (
            <ContextMenu.Portal>
                <ContextMenu.Content className={RDX_CONTENT_CLASS} alignOffset={5} onCloseAutoFocus={onCloseAutoFocus}>
                    <ContextMenu.Sub>
                        <ContextMenu.SubTrigger className={RDX_SUB_TRIGGER_CLASS}>
                            Add Image
                            <div className="ml-auto pl-5 text-gray-400">▶</div>
                        </ContextMenu.SubTrigger>
                        <ContextMenu.Portal>
                            <ContextMenu.SubContent className={RDX_SUB_CONTENT_CLASS} sideOffset={2} alignOffset={-5} >
                                {availableImages.length > 0 ? (
                                    availableImages.map(availImg => (
                                        <ContextMenu.Item
                                            key={availImg.src}
                                            className={RDX_ITEM_CLASS + " flex items-center"}
                                            onSelect={() => handleAddNewImageFromAvailable(availImg, triggerX, triggerY)}
                                        >
                                            <Image src={availImg.src} alt={availImg.alt} width={24} height={24} className="mr-2 inline-block object-contain rounded-sm" />
                                            <span className="truncate flex-grow">{availImg.alt}</span>
                                        </ContextMenu.Item>
                                    ))
                                ) : (
                                    <ContextMenu.Item disabled className={RDX_ITEM_CLASS}>No images found</ContextMenu.Item>
                                )}
                            </ContextMenu.SubContent>
                        </ContextMenu.Portal>
                    </ContextMenu.Sub>
                </ContextMenu.Content>
            </ContextMenu.Portal>
        );
    }

    // Image-Specific ContextMenu
    if (!currentImage) return null; // Should have a current image if imageId is not null

    return (
        <ContextMenu.Portal>
            <ContextMenu.Content className={RDX_CONTENT_CLASS} alignOffset={5} onCloseAutoFocus={onCloseAutoFocus}>
                <ContextMenu.Item className={RDX_ITEM_CLASS} onSelect={() => handleDeleteImage(currentImage.id)}>Delete</ContextMenu.Item>
                <ContextMenu.Separator className={RDX_SEPARATOR_CLASS} />
                <div className="px-3 py-1.5 text-sm">
                    <label htmlFor={`sizeSlider-${currentImage.id}`} className="block mb-1 text-gray-300">Size: {currentImage.visualWidth}px</label>
                    <input
                        type="range" id={`sizeSlider-${currentImage.id}`}
                        min="10" max="1024"
                        value={currentImage.visualWidth}
                        onChange={(ev) => {
                            const newVisualWidth = parseInt(ev.target.value, 10);
                            setImages(prevImages =>
                                prevImages.map(img => {
                                    if (img.id === currentImage.id) {
                                        const aspectRatio = img.width / img.height;
                                        return { ...img, visualWidth: newVisualWidth, visualHeight: Math.round(newVisualWidth / (aspectRatio || 1)) };
                                    }
                                    return img;
                                })
                            );
                        }}
                        className={RDX_INPUT_CLASS}
                    />
                </div>
                <ContextMenu.Separator className={RDX_SEPARATOR_CLASS} />
                <ContextMenu.Label className={RDX_LABEL_CLASS}>Animation</ContextMenu.Label>
                <ContextMenu.Item className={RDX_ITEM_CLASS} onSelect={() => handleChangeAnimation(currentImage.id, 'none')}>None {currentImage.currentAnimation === 'none' && '✓'}</ContextMenu.Item>
                <ContextMenu.Item className={RDX_ITEM_CLASS} onSelect={() => handleChangeAnimation(currentImage.id, 'bounce')}>Bounce {currentImage.currentAnimation === 'bounce' && '✓'}</ContextMenu.Item>
                <ContextMenu.Item className={RDX_ITEM_CLASS} onSelect={() => handleChangeAnimation(currentImage.id, 'spin')}>Spin {currentImage.currentAnimation === 'spin' && '✓'}</ContextMenu.Item>
                <ContextMenu.Separator className={RDX_SEPARATOR_CLASS} />
                <ContextMenu.Label className={RDX_LABEL_CLASS}>Transform</ContextMenu.Label>
                <div className="px-3 py-1.5 text-sm">
                    <label htmlFor={`rotationSlider-${currentImage.id}`} className="block mb-1 text-gray-300">Rotate: {currentImage.currentRotation}°</label>
                    <input
                        type="range" id={`rotationSlider-${currentImage.id}`}
                        min="0" max="360"
                        value={currentImage.currentRotation}
                        onChange={(ev) => handleChangeRotationInContextMenu(currentImage.id, parseInt(ev.target.value, 10))}
                        className={RDX_INPUT_CLASS}
                    />
                </div>
                <ContextMenu.Item className={RDX_ITEM_CLASS} onSelect={() => handleToggleMirrorInContextMenu(currentImage.id, 'X')}>Mirror X {currentImage.mirroredX ? '(On)' : '(Off)'}</ContextMenu.Item>
                <ContextMenu.Item className={RDX_ITEM_CLASS} onSelect={() => handleToggleMirrorInContextMenu(currentImage.id, 'Y')}>Mirror Y {currentImage.mirroredY ? '(On)' : '(Off)'}</ContextMenu.Item>
                <ContextMenu.Separator className={RDX_SEPARATOR_CLASS} />
                <ContextMenu.Label className={RDX_LABEL_CLASS}>Layering</ContextMenu.Label>
                <ContextMenu.Item className={RDX_ITEM_CLASS} onSelect={() => handleBringToFront(currentImage.id)}>Bring to Front</ContextMenu.Item>
                <ContextMenu.Item className={RDX_ITEM_CLASS} onSelect={() => handleSendToBack(currentImage.id)}>Send to Back</ContextMenu.Item>
                <ContextMenu.Item className={RDX_ITEM_CLASS} onSelect={() => handleBringForward(currentImage.id)}>Bring Forward</ContextMenu.Item>
                <ContextMenu.Item className={RDX_ITEM_CLASS} onSelect={() => handleSendBackward(currentImage.id)}>Send Backward</ContextMenu.Item>
            </ContextMenu.Content>
        </ContextMenu.Portal>
    );
} 