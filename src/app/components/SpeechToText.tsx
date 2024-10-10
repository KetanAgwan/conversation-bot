"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Card, Input, Button, Typography, Space, message } from "antd";
import {
  AudioOutlined,
  AudioMutedOutlined,
  SoundOutlined,
  StopOutlined,
} from "@ant-design/icons";
import { useGeminiAPI } from "../utils/googleGemini"; // Make sure this path is correct

const { TextArea } = Input;
const { Title } = Typography;

interface IWebkitSpeechRecognition extends SpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
}

declare global {
  interface Window {
    webkitSpeechRecognition: new () => IWebkitSpeechRecognition;
  }
}

export default function EnhancedVoiceRecognition(): JSX.Element {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [text, setText] = useState<string>(""); // Speech text
  const [interimResult, setInterimResult] = useState<string>(""); // Partial speech
  const [isResponding, setIsResponding] = useState<boolean>(false); // Flag for AI response loading
  const [response, setResponse] = useState<string>(""); // AI response
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false); // Flag for speech synthesis
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const { generateContent, isLoading } = useGeminiAPI();

  // Initialize the speech recognition
  const initializeSpeechRecognition = useCallback(() => {
    if (
      typeof window !== "undefined" &&
      ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)
    ) {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current =
        new SpeechRecognition() as IWebkitSpeechRecognition;
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onstart = () => {
        setIsListening(true);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = "";
        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + " ";
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          setText((prevText) => prevText + finalTranscript);
        }
        setInterimResult(interimTranscript);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    } else {
      console.error("Speech recognition not supported in this browser");
    }
  }, []);

  useEffect(() => {
    initializeSpeechRecognition();
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [initializeSpeechRecognition]);

  // Start listening for speech input
  const startListening = useCallback((): void => {
    setText(""); // Clear the previous text before starting
    setInterimResult(""); // Clear interim result
    if (!recognitionRef.current) {
      initializeSpeechRecognition();
    }
    if (recognitionRef.current) {
      recognitionRef.current.start();
    } else {
      message.error("Failed to start speech recognition. Please try again.");
    }
  }, [initializeSpeechRecognition]);

  // Handles speech synthesis (AI response speaking)
  const chunkAndSpeak = useCallback((text: string): void => {
    const chunkSize = 25;
    const words = text.split(" ");
    const chunks = [];
    for (let i = 0; i < words.length; i += chunkSize) {
      chunks.push(words.slice(i, i + chunkSize).join(" "));
    }

    const speakChunk = (chunkIndex: number, voices: SpeechSynthesisVoice[]) => {
      if (chunkIndex >= chunks.length) {
        setIsSpeaking(false);
        return;
      }
      const utterance = new SpeechSynthesisUtterance(chunks[chunkIndex]);
      utterance.voice = voices[0]; // You can customize this if you need a specific voice
      utterance.onend = () => speakChunk(chunkIndex + 1, voices);
      window.speechSynthesis.speak(utterance);
    };

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      speakChunk(0, voices);
      setIsSpeaking(true);
    } else {
      // Wait for voices to load
      window.speechSynthesis.onvoiceschanged = () => {
        const loadedVoices = window.speechSynthesis.getVoices();
        speakChunk(0, loadedVoices);
        setIsSpeaking(true);
      };
    }
  }, []);

  const stopSpeaking = (): void => {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  // useEffect to trigger response generation once the `text` state is updated
  useEffect(() => {
    const generateAIResponse = async () => {
      if (text.trim()) {
        setIsResponding(true);
        try {
          const result = await generateContent(text);
          setResponse(result);
          // Automatically start speaking the response after it's received
          chunkAndSpeak(result);
        } catch (error) {
          console.error(error);
          message.error("Failed to generate response. Please try again.");
        } finally {
          setIsResponding(false);
        }
      }
    };

    // Generate response if there's finalized text
    if (!isListening && text.trim()) {
      generateAIResponse();
    }
  }, [text, generateContent, isListening, chunkAndSpeak]);

  return (
    <div
      className="page"
      style={{
        backgroundColor: "#ededed",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        boxSizing: "border-box",
      }}
    >
      <Card
        style={{
          width: "100%",
          maxWidth: 600,
          marginTop: "-250px",
          boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
          padding: "20px",
          borderRadius: "10px",
        }}
      >
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <Title
            level={3}
            style={{ textAlign: "center", marginBottom: "20px" }}
          >
            Coversation Bot
          </Title>

          <TextArea
            value={text + interimResult}
            onChange={(e) => setText(e.target.value)}
            placeholder="Your speech will appear here..."
            autoSize={{ minRows: 4, maxRows: 6 }}
            maxLength={500}
            showCount
            style={{
              fontSize: "16px",
              padding: "10px",
              borderColor: "#d9d9d9",
            }}
          />

          <div style={{ textAlign: "center" }}>
            {isListening ? (
              <AudioOutlined
                style={{
                  fontSize: 48,
                  color: "#52c41a",
                  animation: "pulse 2s infinite",
                }}
              />
            ) : (
              <AudioMutedOutlined style={{ fontSize: 48, color: "#d9d9d9" }} />
            )}
          </div>

          <Space style={{ width: "100%", justifyContent: "center" }}>
            <Button
              type="primary"
              onClick={startListening}
              disabled={isListening || isResponding}
              style={{ width: 150 }}
            >
              Start Recognition
            </Button>
            <Button
              onClick={stopSpeaking}
              disabled={!isSpeaking}
              style={{ width: 120 }}
              icon={<StopOutlined />}
            >
              Stop Speaking
            </Button>
          </Space>

          {response && (
            <Card
              title="AI Response"
              extra={
                <Button
                  icon={<SoundOutlined />}
                  onClick={() => chunkAndSpeak(response)}
                >
                  Speak Again
                </Button>
              }
            >
              <p>{response}</p>
            </Card>
          )}

          {(isResponding || isLoading) && (
            <div style={{ textAlign: "center" }}>
              <SoundOutlined spin style={{ fontSize: 24 }} />
              <p>Generating response...</p>
            </div>
          )}
        </Space>
      </Card>
    </div>
  );
}
